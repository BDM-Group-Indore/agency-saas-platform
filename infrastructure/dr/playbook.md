# AdPulse SaaS — Disaster Recovery Playbook

**Owner:** Kunal (DevOps / Infrastructure)  
**Last Updated:** 2026-06-04  
**Classification:** INTERNAL — CRITICAL OPERATIONS

---

## Overview

This playbook defines the step-by-step procedures for detecting, responding to, and recovering from a disaster event affecting the AdPulse SaaS platform.

| Property | Value |
|---|---|
| **RTO (Recovery Time Objective)** | ≤ 30 minutes |
| **RPO (Recovery Point Objective)** | ≤ 15 minutes |
| **Primary Region** | `ap-south-1` (Mumbai) |
| **DR Region** | `ap-southeast-1` (Singapore) |
| **On-Call Contact** | Kunal — `+91-XXXXXXXXXX` |
| **Slack Channel** | `#ops-alerts` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMARY  (ap-south-1 — Mumbai)                             │
│                                                             │
│  Route53 ──► ALB ──► ECS Fargate (API + Web, desired=2)    │
│                         │                                   │
│              Multi-AZ RDS PostgreSQL ──┐                    │
│              ElastiCache Redis         │                     │
└────────────────────────────────────────┼────────────────────┘
                           Cross-region  │ async replication
┌──────────────────────────────────────── ▼ ─────────────────┐
│  DR HOT-STANDBY  (ap-southeast-1 — Singapore)              │
│                                                             │
│  Route53 ──► ALB ──► ECS Fargate (API + Web, desired=0)    │
│                         │                                   │
│              RDS Read Replica ◄── promoted on failover      │
│              Redis (standalone — independent)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Incident Severity Classification

| Level | Description | Response Time | Action |
|---|---|---|---|
| **P1 — Critical** | Platform fully down > 5 min | Immediate | Full DR failover |
| **P2 — Major** | Partial outage (DB / ECS) | < 10 min | Targeted recovery |
| **P3 — Minor** | Performance degraded | < 30 min | Monitor + scale |
| **P4 — Info** | Non-impacting alerts | < 2 hrs | Log and review |

---

## Contact Matrix

| Role | Name | Availability | Contact |
|---|---|---|---|
| DevOps Lead | Kunal | 24/7 | Slack: `@kunal` |
| Backend Lead | Abhishek | Business hours | Slack: `@abhishek` |
| Frontend Lead | Shivam | Business hours | Slack: `@shivam` |
| AWS Support | — | 24/7 | Support plan portal |

---

## Section 1 — Detection & Assessment (0–5 min)

### 1.1 Automated Alerts
CloudWatch Alarms fire to SNS → Email + Slack `#ops-alerts`:
- `adpulse-primary-rds-cpu-critical` — RDS CPU > 90% for 3 min
- `adpulse-primary-alb-5xx-critical` — ALB 5xx > 50/min

### 1.2 Manual Health Check
```bash
# Check primary RDS status
aws rds describe-db-instances \
  --db-instance-identifier adpulse-production-postgres \
  --region ap-south-1 \
  --query 'DBInstances[0].DBInstanceStatus'

# Check ECS cluster
aws ecs describe-clusters \
  --clusters adpulse-production \
  --region ap-south-1 \
  --query 'clusters[0].status'

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <API_TG_ARN> \
  --region ap-south-1
```

### 1.3 Decision Criteria

```
Primary region health check
         │
     HEALTHY?
    /        \
  YES          NO
   │            │
Monitor       Is it likely to self-heal in < 10 min?
               /       \
            YES          NO
             │            │
         P3/P2           ► TRIGGER FAILOVER (Section 2)
         Wait
```

---

## Section 2 — Failover Procedure (P1 — Full DR)

> **Estimated Time:** 15–30 minutes  
> **Script:** `infrastructure/scripts/dr-failover.sh`

### Step 1 — Notify Team (2 min)

Post to `#ops-alerts`:
```
🚨 *INCIDENT DECLARED — P1*
Time: <timestamp>
Issue: <description>
IC (Incident Commander): @kunal
Status: Initiating DR failover to ap-southeast-1
```

### Step 2 — Dry-Run First (3 min)

```bash
cd infrastructure/scripts
chmod +x dr-failover.sh
./dr-failover.sh --dry-run
```

Review output. If output is correct, proceed.

### Step 3 — Execute Full Failover (10–20 min)

```bash
# Set required env vars
export ROUTE53_ZONE_ID="<your-hosted-zone-id>"
export SLACK_WEBHOOK_URL="<your-webhook>"

./dr-failover.sh
```

The script will:
1. ✅ Confirm primary is down
2. 🔄 Promote `adpulse-dr-postgres-replica` to standalone primary
3. ⬆️ Scale ECS services in `ap-southeast-1` to `desired_count=2`
4. 🌐 Update Route53 CNAME: `api.adpulse.io` + `app.adpulse.io` → DR ALB
5. 🏥 Run `/health` check
6. 📣 Send Slack notification

### Step 4 — Post-Failover Verification (5 min)

```bash
# Verify API is responding from DR
curl -I https://api.adpulse.io/health

# Verify web app
curl -I https://app.adpulse.io

# Check DR RDS is accepting writes
psql -h <DR_RDS_ENDPOINT> -U adpulse_admin -d adpulse -c "SELECT NOW();"

# Verify ECS tasks are running
aws ecs list-tasks \
  --cluster adpulse-dr \
  --service-name adpulse-api \
  --region ap-southeast-1
```

Expected results:
- `https://api.adpulse.io/health` → `{"status": "ok"}`
- ECS services show `RUNNING` tasks

---

## Section 3 — Backup & Restore Procedures

### 3.1 Manual Backup

```bash
chmod +x infrastructure/scripts/backup-restore.sh

# Production backup
PGPASSWORD=<password> ./backup-restore.sh backup --env production

# Staging backup
PGPASSWORD=<password> ./backup-restore.sh backup --env staging
```

### 3.2 List Available Backups

```bash
./backup-restore.sh list --env production
```

### 3.3 Restore from Latest Backup

```bash
# Restore latest S3 pg_dump
PGPASSWORD=<password> DB_HOST=<rds_endpoint> \
  ./backup-restore.sh restore --env production

# Restore specific RDS snapshot
./backup-restore.sh restore \
  --env production \
  --snapshot adpulse-production-postgres-manual-20260604-120000
```

> [!WARNING]
> Restore DROPS the existing database. Always back up first if unsure.

### 3.4 Automated Backup Schedule

Configured via EventBridge in `infrastructure/terraform/main.tf`:
- **Full backup:** Daily at 02:00 IST
- **RDS automated snapshots:** Every 14 days retention (configured on RDS instance)
- **S3 lifecycle:** `STANDARD_IA` after 7 days, `GLACIER` after 30 days, delete after 365 days

---

## Section 4 — Failback (DR → Primary) 

> Run once primary region is healthy again

### Step 1 — Verify Primary Recovery

```bash
aws rds describe-db-instances \
  --db-instance-identifier adpulse-production-postgres \
  --region ap-south-1 \
  --query 'DBInstances[0].DBInstanceStatus'
# Expected: "available"
```

### Step 2 — Sync DR → Primary Data (if needed)

```bash
# Take a final pg_dump from DR before failback
PGPASSWORD=<password> DB_HOST=<DR_RDS_ENDPOINT> \
  ./backup-restore.sh backup --env production

# Restore to primary
PGPASSWORD=<password> DB_HOST=<PRIMARY_RDS_ENDPOINT> \
  ./backup-restore.sh restore --env production
```

### Step 3 — Execute Failback

```bash
./dr-failover.sh --restore-only
```

This re-points Route53 back to primary ALB and scales down DR ECS to 0.

### Step 4 — Rebuild DR Read Replica

After failover, the DR RDS is no longer a replica. Re-create it:

```bash
# In Terraform — delete and re-apply the dr_replica resource
terraform destroy -target=aws_db_instance.dr_replica
terraform apply -target=aws_db_instance.dr_replica
```

---

## Section 5 — Communication Templates

### Internal (Slack `#ops-alerts`)

**Incident Start:**
```
🚨 INCIDENT P1 | AdPulse Platform
⏰ Detected: <time>
📍 Impact: <description>
🔧 IC: @kunal
📊 Status: Investigating / Failing over to DR
```

**Update (every 15 min):**
```
📊 INCIDENT UPDATE | AdPulse
⏰ <time>
🔄 Current status: <e.g. DR failover in progress>
✅ Completed: <step>
⏳ Next: <step>
```

**Resolution:**
```
✅ INCIDENT RESOLVED | AdPulse
⏰ Resolved: <time>
📊 Duration: <X> minutes
📍 Root cause: <brief>
📋 Action items: <post-mortem link>
```

### External (Status Page / Customer Email)

**In-Progress:**
> We are currently experiencing service disruption. Our engineering team is actively working on a resolution. We apologize for the inconvenience and will provide updates every 15 minutes.

**Resolved:**
> The incident has been resolved. Service is fully restored. We will publish a full post-mortem within 48 hours. Thank you for your patience.

---

## Section 6 — Post-Mortem Process

After every P1/P2 incident, complete a post-mortem within **48 hours**:

1. **Timeline** — exact sequence of events
2. **Root Cause** — what caused the incident
3. **Impact** — duration, affected customers, data loss (if any)
4. **Resolution** — what fixed it
5. **Action Items** — at least 3 follow-up improvements with owners and due dates

Post-mortem template: `docs/post-mortem-template.md`  
Post-mortems stored in: `docs/post-mortems/YYYY-MM-DD-<title>.md`

---

## Section 7 — DR Test Schedule

| Test Type | Frequency | Responsible | Last Run | Next Due |
|---|---|---|---|---|
| Backup restore verification | Monthly | Kunal | 2026-05-01 | 2026-07-01 |
| Full DR failover (staging) | Quarterly | Kunal | 2026-04-01 | 2026-07-01 |
| Tabletop exercise | Bi-annual | All leads | 2026-01-01 | 2026-07-01 |

**DR Test Procedure (Staging):**
```bash
# 1. Run backup
./backup-restore.sh backup --env staging

# 2. Trigger failover (non-destructive dry-run first)
./dr-failover.sh --dry-run

# 3. Execute staging failover
./dr-failover.sh

# 4. Verify staging routes work
curl -I https://staging.adpulse.io/health

# 5. Failback
./dr-failover.sh --restore-only

# 6. Document results in this table ↑
```

---

## Appendix — Key AWS Resource IDs

> Fill these in after initial Terraform apply

| Resource | ID / ARN |
|---|---|
| Primary VPC | `vpc-XXXXXXXX` |
| DR VPC | `vpc-XXXXXXXX` |
| Primary RDS | `adpulse-production-postgres` |
| DR RDS Replica | `adpulse-dr-postgres-replica` |
| Primary ALB ARN | `arn:aws:elasticloadbalancing:ap-south-1:...` |
| DR ALB ARN | `arn:aws:elasticloadbalancing:ap-southeast-1:...` |
| Route53 Hosted Zone | `ZXXXXXXXXXXXXX` |
| S3 Backup Bucket | `adpulse-db-backups` |
| SNS Topic ARN | `arn:aws:sns:ap-south-1:...:adpulse-ops-alerts` |
| ECS Primary Cluster | `adpulse-production` |
| ECS DR Cluster | `adpulse-dr` |
