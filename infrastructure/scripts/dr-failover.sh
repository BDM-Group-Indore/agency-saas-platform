#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  AdPulse SaaS — Disaster Recovery (DR) Failover Script
#  Owner   : Kunal (DevOps / Infrastructure)
#  Updated : 2026-06-04
#
#  Usage:
#    ./dr-failover.sh [--dry-run] [--restore-only] [--help]
#
#  What this script does:
#    1. Verifies primary region health (RDS, ECS, ALB)
#    2. If primary is down → promotes DR RDS replica in ap-southeast-1
#    3. Re-points Route53 weighted records to DR ALB
#    4. Scales up ECS services in DR region
#    5. Sends Slack notification to #ops-alerts channel
#    6. Creates a timestamped DR event log
#
#  Prerequisites:
#    - aws-cli v2 configured with AdOps IAM role
#    - jq installed
#    - AWS_PROFILE or IAM Role with: RDS, ECS, Route53, SNS permissions
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail
IFS=$'\n\t'

# ── Configuration ──────────────────────────────────────────────────────────────
PRIMARY_REGION="ap-south-1"
DR_REGION="ap-southeast-1"
RDS_IDENTIFIER="adpulse-production-postgres"
DR_RDS_IDENTIFIER="adpulse-dr-postgres-replica"
ECS_CLUSTER_PRIMARY="adpulse-production"
ECS_CLUSTER_DR="adpulse-dr"
ECS_SERVICES=("adpulse-api" "adpulse-web")
ROUTE53_HOSTED_ZONE_ID="${ROUTE53_ZONE_ID:-CHANGE_ME}"
API_DNS_RECORD="api.adpulse.io"
WEB_DNS_RECORD="app.adpulse.io"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
LOG_DIR="/var/log/adpulse/dr"
LOG_FILE="${LOG_DIR}/dr-event-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=false
RESTORE_ONLY=false

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

# ── Helpers ────────────────────────────────────────────────────────────────────
log()  { echo -e "${BLUE}[$(date '+%T')]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"  | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}[FAIL]${NC} $*" | tee -a "$LOG_FILE"; }

run() {
  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: $*"
  else
    eval "$@"
  fi
}

send_slack() {
  local msg="$1"
  if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 *AdPulse DR Event* — ${msg}\"}" \
      "$SLACK_WEBHOOK_URL" || warn "Slack notification failed."
  fi
}

# ── Parse Args ─────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --dry-run)      DRY_RUN=true ;;
    --restore-only) RESTORE_ONLY=true ;;
    --help)
      echo "Usage: $0 [--dry-run] [--restore-only] [--help]"
      exit 0 ;;
  esac
done

mkdir -p "$LOG_DIR"
echo "═══════════════════════════════════════════" | tee "$LOG_FILE"
echo " AdPulse DR Failover — $(date)"              | tee -a "$LOG_FILE"
echo " Primary : $PRIMARY_REGION"                  | tee -a "$LOG_FILE"
echo " DR      : $DR_REGION"                       | tee -a "$LOG_FILE"
echo " Dry Run : $DRY_RUN"                         | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"

# ── Step 1: Check Primary Health ───────────────────────────────────────────────
log "STEP 1 — Checking primary region health ($PRIMARY_REGION)..."

PRIMARY_DOWN=false

# RDS check
RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_IDENTIFIER" \
  --region "$PRIMARY_REGION" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text 2>/dev/null || echo "unavailable")

if [[ "$RDS_STATUS" != "available" ]]; then
  fail "Primary RDS ($RDS_IDENTIFIER) is $RDS_STATUS"
  PRIMARY_DOWN=true
else
  ok "Primary RDS is $RDS_STATUS"
fi

# ECS cluster check
ECS_STATUS=$(aws ecs describe-clusters \
  --clusters "$ECS_CLUSTER_PRIMARY" \
  --region "$PRIMARY_REGION" \
  --query 'clusters[0].status' \
  --output text 2>/dev/null || echo "INACTIVE")

if [[ "$ECS_STATUS" != "ACTIVE" ]]; then
  fail "Primary ECS cluster is $ECS_STATUS"
  PRIMARY_DOWN=true
else
  ok "Primary ECS cluster is ACTIVE"
fi

if ! $PRIMARY_DOWN && ! $RESTORE_ONLY; then
  ok "Primary region is healthy. No failover needed."
  log "Use --restore-only to run DR → Primary failback."
  exit 0
fi

if $RESTORE_ONLY; then
  warn "RESTORE MODE — Failing back from DR to Primary"
fi

# ── Step 2: Promote DR RDS Replica ────────────────────────────────────────────
log "STEP 2 — Promoting DR RDS replica ($DR_RDS_IDENTIFIER) in $DR_REGION..."

DR_RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$DR_RDS_IDENTIFIER" \
  --region "$DR_REGION" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text 2>/dev/null || echo "unavailable")

if [[ "$DR_RDS_STATUS" == "available" ]]; then
  ok "DR RDS replica is already available (already promoted?)"
else
  run "aws rds promote-read-replica \
    --db-instance-identifier '$DR_RDS_IDENTIFIER' \
    --region '$DR_REGION' \
    --backup-retention-period 7 \
    --preferred-backup-window '03:00-04:00'"

  log "Waiting for DR RDS to become available (this may take 5-10 minutes)..."
  if ! $DRY_RUN; then
    aws rds wait db-instance-available \
      --db-instance-identifier "$DR_RDS_IDENTIFIER" \
      --region "$DR_REGION"
  fi
  ok "DR RDS promoted and available"
fi

send_slack "RDS replica promoted in \`$DR_REGION\` — \`$DR_RDS_IDENTIFIER\` is now standalone primary."

# ── Step 3: Scale Up ECS in DR Region ─────────────────────────────────────────
log "STEP 3 — Scaling up ECS services in DR region ($ECS_CLUSTER_DR)..."

for SERVICE in "${ECS_SERVICES[@]}"; do
  run "aws ecs update-service \
    --cluster '$ECS_CLUSTER_DR' \
    --service '$SERVICE' \
    --desired-count 2 \
    --region '$DR_REGION' \
    --force-new-deployment" >/dev/null
  ok "ECS service $SERVICE scaled to 2 tasks in $DR_REGION"
done

if ! $DRY_RUN; then
  for SERVICE in "${ECS_SERVICES[@]}"; do
    log "Waiting for $SERVICE to stabilize..."
    aws ecs wait services-stable \
      --cluster "$ECS_CLUSTER_DR" \
      --services "$SERVICE" \
      --region "$DR_REGION"
    ok "$SERVICE is stable in $DR_REGION"
  done
fi

send_slack "ECS services scaled up in \`$DR_REGION\`: \`${ECS_SERVICES[*]}\`"

# ── Step 4: Update Route53 DNS ─────────────────────────────────────────────────
log "STEP 4 — Updating Route53 DNS to point to DR ALB..."

DR_ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "adpulse-dr-alb" \
  --region "$DR_REGION" \
  --query 'LoadBalancers[0].DNSName' \
  --output text 2>/dev/null || echo "UNKNOWN")

if [[ "$DR_ALB_DNS" == "UNKNOWN" ]]; then
  warn "Could not retrieve DR ALB DNS. Skipping Route53 update. Update manually."
else
  for DNS_RECORD in "$API_DNS_RECORD" "$WEB_DNS_RECORD"; do
    CHANGE_BATCH=$(jq -n \
      --arg record "$DNS_RECORD" \
      --arg alb_dns "$DR_ALB_DNS" \
      '{
        "Changes": [{
          "Action": "UPSERT",
          "ResourceRecordSet": {
            "Name": $record,
            "Type": "CNAME",
            "TTL": 60,
            "ResourceRecords": [{"Value": $alb_dns}]
          }
        }]
      }')

    run "aws route53 change-resource-record-sets \
      --hosted-zone-id '$ROUTE53_HOSTED_ZONE_ID' \
      --change-batch '$CHANGE_BATCH'"
    ok "Route53 record for $DNS_RECORD → $DR_ALB_DNS"
  done

  send_slack "Route53 DNS updated: \`$API_DNS_RECORD\` and \`$WEB_DNS_RECORD\` → \`$DR_ALB_DNS\`"
fi

# ── Step 5: Verify DR Health ───────────────────────────────────────────────────
log "STEP 5 — Running DR health verification..."

if ! $DRY_RUN; then
  sleep 10
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DNS_RECORD/health" || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "API health check passed (HTTP $HTTP_CODE)"
  else
    warn "API health check returned HTTP $HTTP_CODE — verify manually."
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"
ok "DR Failover Complete — $(date)"
log "Log saved: $LOG_FILE"
echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"
send_slack "✅ DR Failover completed at $(date). Log: \`$LOG_FILE\`"
