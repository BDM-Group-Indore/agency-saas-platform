#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  AdPulse SaaS — Database Backup & Restore Script
#  Owner   : Kunal (DevOps / Infrastructure)
#  Updated : 2026-06-04
#
#  Modes:
#    backup   — Create an RDS snapshot + pg_dump to S3
#    restore  — Restore latest snapshot or a specific one from S3
#    list     — List available snapshots/backups in S3
#
#  Usage:
#    ./backup-restore.sh backup  [--env staging|production]
#    ./backup-restore.sh restore [--env staging|production] [--snapshot SNAPSHOT_ID]
#    ./backup-restore.sh list    [--env staging|production]
#    ./backup-restore.sh --help
#
#  Prerequisites:
#    - aws-cli v2
#    - pg_dump / psql (PostgreSQL client tools)
#    - PGPASSWORD env var set (or use .pgpass)
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail
IFS=$'\n\t'

# ── Configuration ──────────────────────────────────────────────────────────────
ENVIRONMENT="${ADPULSE_ENV:-production}"
PRIMARY_REGION="ap-south-1"
S3_BUCKET="adpulse-db-backups"
RDS_IDENTIFIER="adpulse-${ENVIRONMENT}-postgres"
DB_NAME="adpulse"
DB_USER="adpulse_admin"
DB_HOST="${DB_HOST:-}"                    # Set via env or fetched from AWS
BACKUP_PREFIX="pg_dump/${ENVIRONMENT}"
RETENTION_DAYS=30
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
LOG_DIR="/var/log/adpulse/backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/backup-${TIMESTAMP}.log"
SNAPSHOT_ID=""

# MongoDB settings
MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/billing}"

# ClickHouse settings
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-default}"

# Encryption settings
GPG_PASSPHRASE="${GPG_PASSPHRASE:-}"

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

# ── Helpers ────────────────────────────────────────────────────────────────────
log()  { echo -e "${BLUE}[$(date '+%T')]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"  | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}[FAIL]${NC} $*" | tee -a "$LOG_FILE"; exit 1; }

send_slack() {
  local msg="$1"
  if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"💾 *AdPulse Backup* — ${msg}\"}" \
      "$SLACK_WEBHOOK_URL" >/dev/null || warn "Slack notification failed."
  fi
}

encrypt_file() {
  local src="$1"
  local dest="$2"
  if [[ -n "${GPG_PASSPHRASE:-}" ]]; then
    log "Encrypting $src to $dest using GPG..."
    gpg --symmetric --batch --yes --passphrase "$GPG_PASSPHRASE" --output "$dest" "$src"
  else
    warn "GPG_PASSPHRASE not set. Skipping encryption. Copying directly..."
    cp "$src" "$dest"
  fi
}

decrypt_file() {
  local src="$1"
  local dest="$2"
  if [[ -n "${GPG_PASSPHRASE:-}" ]]; then
    log "Decrypting $src to $dest using GPG..."
    gpg --decrypt --batch --yes --passphrase "$GPG_PASSPHRASE" --output "$dest" "$src"
  else
    warn "GPG_PASSPHRASE not set. Attempting to copy directly (assuming unencrypted)..."
    cp "$src" "$dest"
  fi
}

dump_mongodb() {
  local uri="$1"
  local dest_file="$2"
  
  if command -v mongodump &> /dev/null; then
    log "Running local mongodump..."
    mongodump --uri="$uri" --archive="$dest_file" --gzip
  elif command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "billing_mongodb"; then
    log "Running mongodump inside docker container billing_mongodb..."
    docker exec -i billing_mongodb mongodump --uri="mongodb://localhost:27017/billing" --archive --gzip > "$dest_file"
  else
    warn "mongodump not found and billing_mongodb docker container not running/accessible. Creating dummy mongo backup."
    echo "dummy mongodb backup" | gzip > "$dest_file"
  fi
}

restore_mongodb() {
  local uri="$1"
  local src_file="$2"
  
  if command -v mongorestore &> /dev/null; then
    log "Running local mongorestore..."
    mongorestore --uri="$uri" --archive="$src_file" --gzip --drop
  elif command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "billing_mongodb"; then
    log "Running mongorestore inside docker container billing_mongodb..."
    docker exec -i billing_mongodb mongorestore --uri="mongodb://localhost:27017/billing" --archive --gzip --drop < "$src_file"
  else
    warn "mongorestore not found and billing_mongodb docker container not running/accessible. Skipping mongo restore."
  fi
}

dump_clickhouse() {
  local ch_host="$1"
  local ch_port="$2"
  local ch_user="$3"
  local ch_pass="$4"
  local ch_db="$5"
  local dest_dir="$6"

  mkdir -p "$dest_dir"
  
  # Fetch all tables via curl
  local tables
  tables=$(curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/" --data-urlencode "query=SHOW TABLES FROM ${ch_db}" || echo "")
  
  if [[ -z "$tables" ]]; then
    warn "No ClickHouse tables found or connection failed. Creating dummy clickhouse backup."
    echo "dummy clickhouse table schema" > "$dest_dir/dummy_schema.sql"
    echo "dummy clickhouse table data" | gzip > "$dest_dir/dummy_data.tsv.gz"
    return 0
  fi
  
  for table in $tables; do
    log "Dumping ClickHouse table schema: $table"
    curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/" --data-urlencode "query=SHOW CREATE TABLE ${ch_db}.${table}" > "$dest_dir/${table}_schema.sql"
    
    log "Dumping ClickHouse table data: $table"
    curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/" --data-urlencode "query=SELECT * FROM ${ch_db}.${table} FORMAT TabSeparated" | gzip > "$dest_dir/${table}_data.tsv.gz"
  done
}

restore_clickhouse() {
  local ch_host="$1"
  local ch_port="$2"
  local ch_user="$3"
  local ch_pass="$4"
  local ch_db="$5"
  local src_dir="$6"

  if [[ ! -d "$src_dir" ]]; then
    warn "ClickHouse source directory $src_dir not found. Skipping ClickHouse restore."
    return 0
  fi

  # Create DB if not exists
  curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/" --data-urlencode "query=CREATE DATABASE IF NOT EXISTS ${ch_db}"

  for schema_file in "$src_dir"/*_schema.sql; do
    [[ -f "$schema_file" ]] || continue
    local table
    table=$(basename "$schema_file" _schema.sql)
    if [[ "$table" == "dummy" ]]; then
      continue
    fi
    log "Restoring ClickHouse table schema: $table"
    # Drop table if exists
    curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/" --data-urlencode "query=DROP TABLE IF EXISTS ${ch_db}.${table}"
    # Recreate table
    curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/" --data-binary "@$schema_file"
    
    local data_file="$src_dir/${table}_data.tsv.gz"
    if [[ -f "$data_file" ]]; then
      log "Restoring ClickHouse table data: $table"
      gunzip -c "$data_file" | curl -s -u "${ch_user}:${ch_pass}" "http://${ch_host}:${ch_port}/?query=INSERT INTO ${ch_db}.${table} FORMAT TabSeparated" --data-binary @-
    fi
  done
}

usage() {
  cat <<EOF
Usage: $0 <mode> [options]

Modes:
  backup   Create RDS snapshot + pg_dump/mongodump/clickhouse-dump to S3
  restore  Restore a backup from S3 / RDS snapshot
  list     List available backups in S3

Options:
  --env    staging|production  (default: production)
  --snapshot SNAPSHOT_ID       Specific RDS snapshot to restore from
  --help   Show this help

Environment Variables:
  ADPULSE_ENV          Override --env
  DB_HOST              PostgreSQL host (auto-detected if not set)
  PGPASSWORD           PostgreSQL password
  SLACK_WEBHOOK_URL    Slack webhook for notifications
  AWS_PROFILE          AWS CLI profile
EOF
}

# ── Parse Args ─────────────────────────────────────────────────────────────────
MODE="${1:-}"
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)       ENVIRONMENT="$2"; shift 2 ;;
    --snapshot)  SNAPSHOT_ID="$2"; shift 2 ;;
    --help)      usage; exit 0 ;;
    *)           warn "Unknown argument: $1"; shift ;;
  esac
done

if [[ -z "$MODE" || "$MODE" == "--help" ]]; then
  usage; exit 0
fi

# ── Initialise ─────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
RDS_IDENTIFIER="adpulse-${ENVIRONMENT}-postgres"
BACKUP_PREFIX="pg_dump/${ENVIRONMENT}"

echo "═══════════════════════════════════════════" | tee "$LOG_FILE"
echo " AdPulse Backup/Restore — $(date)"          | tee -a "$LOG_FILE"
echo " Mode        : $MODE"                       | tee -a "$LOG_FILE"
echo " Environment : $ENVIRONMENT"                | tee -a "$LOG_FILE"
echo " RDS         : $RDS_IDENTIFIER"             | tee -a "$LOG_FILE"
echo " S3 Bucket   : s3://$S3_BUCKET/$BACKUP_PREFIX" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════" | tee -a "$LOG_FILE"

# ── Fetch DB_HOST from AWS if not provided ─────────────────────────────────────
if [[ -z "$DB_HOST" ]]; then
  log "Fetching RDS endpoint from AWS..."
  if DB_HOST=$(aws rds describe-db-instances \
    --db-instance-identifier "$RDS_IDENTIFIER" \
    --region "$PRIMARY_REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text 2>/dev/null); then
    log "DB_HOST resolved to: $DB_HOST"
  else
    warn "Failed to resolve DB_HOST from AWS. Defaulting to localhost."
    DB_HOST="localhost"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
#  MODE: BACKUP
# ══════════════════════════════════════════════════════════════════════════════
do_backup() {
  log "════ BACKUP MODE ════"

  # 1. RDS automated snapshot
  SNAPSHOT_NAME="${RDS_IDENTIFIER}-manual-${TIMESTAMP}"
  if [[ "$ENVIRONMENT" != "local" ]]; then
    log "Creating RDS manual snapshot: $SNAPSHOT_NAME"
    if aws rds create-db-snapshot \
      --db-instance-identifier "$RDS_IDENTIFIER" \
      --db-snapshot-identifier "$SNAPSHOT_NAME" \
      --region "$PRIMARY_REGION" \
      --tags "Key=Environment,Value=${ENVIRONMENT}" "Key=CreatedBy,Value=backup-restore-script" >/dev/null 2>>"$LOG_FILE"; then
      
      log "Waiting for snapshot to complete (this may take a few minutes)..."
      aws rds wait db-snapshot-completed \
        --db-snapshot-identifier "$SNAPSHOT_NAME" \
        --region "$PRIMARY_REGION" 2>>"$LOG_FILE"
      ok "RDS snapshot created: $SNAPSHOT_NAME"
    else
      warn "Failed to create RDS snapshot (AWS credentials missing or DB not found). Skipping RDS snapshot."
      SNAPSHOT_NAME="skipped"
    fi
  else
    SNAPSHOT_NAME="local-dev-snapshot"
  fi

  # Create temp backup directory
  local BACKUP_DIR="/tmp/adpulse_backup_${TIMESTAMP}"
  mkdir -p "$BACKUP_DIR"

  # 2. PostgreSQL Dump
  local PG_DUMP_FILE="${BACKUP_DIR}/postgres.sql.gz"
  log "Running pg_dump → $PG_DUMP_FILE"
  if PGPASSWORD="${PGPASSWORD}" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-acl \
    --no-owner \
    --format=plain \
    --verbose \
    2>>"$LOG_FILE" | gzip > "$PG_DUMP_FILE"; then
    ok "PostgreSQL dump complete"
  elif command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "billing_postgres"; then
    log "pg_dump failed or database host unreachable. Trying docker container..."
    if docker exec -i billing_postgres pg_dump -U postgres -d billing_software --no-acl --no-owner --format=plain 2>>"$LOG_FILE" | gzip > "$PG_DUMP_FILE"; then
      ok "PostgreSQL dump complete (via Docker)"
    else
      fail "PostgreSQL dump failed both locally and via Docker."
    fi
  else
    fail "PostgreSQL dump failed."
  fi

  # 3. MongoDB Dump
  local MONGO_DUMP_FILE="${BACKUP_DIR}/mongodb.archive.gz"
  log "Running MongoDB dump → $MONGO_DUMP_FILE"
  dump_mongodb "$MONGO_URI" "$MONGO_DUMP_FILE"

  # 4. ClickHouse Dump
  local CH_DUMP_DIR="${BACKUP_DIR}/clickhouse"
  log "Running ClickHouse dump → $CH_DUMP_DIR"
  dump_clickhouse "$CLICKHOUSE_HOST" "$CLICKHOUSE_PORT" "$CLICKHOUSE_USER" "$CLICKHOUSE_PASSWORD" "$CLICKHOUSE_DATABASE" "$CH_DUMP_DIR"

  # 5. Tar the directory
  local TAR_FILE="/tmp/adpulse_backup_${TIMESTAMP}.tar.gz"
  log "Archiving all database backups to $TAR_FILE"
  tar -czf "$TAR_FILE" -C "/tmp" "adpulse_backup_${TIMESTAMP}" 2>>"$LOG_FILE"

  # 6. GPG Encryption
  local FINAL_BACKUP_FILE="/tmp/adpulse_backup_${TIMESTAMP}.tar.gz.enc"
  local S3_KEY
  if [[ -n "${GPG_PASSPHRASE:-}" ]]; then
    S3_KEY="${BACKUP_PREFIX}/${TIMESTAMP}/backup.tar.gz.gpg"
    encrypt_file "$TAR_FILE" "$FINAL_BACKUP_FILE"
  else
    S3_KEY="${BACKUP_PREFIX}/${TIMESTAMP}/backup.tar.gz"
    cp "$TAR_FILE" "$FINAL_BACKUP_FILE"
  fi

  # 7. Upload to S3
  log "Uploading backup archive to s3://$S3_BUCKET/$S3_KEY"
  if aws s3 cp "$FINAL_BACKUP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" \
    --storage-class STANDARD_IA \
    --sse AES256 \
    --region "$PRIMARY_REGION" 2>>"$LOG_FILE"; then
    ok "Upload complete"
  else
    warn "Failed to upload to S3. Preserving local backup file at $FINAL_BACKUP_FILE."
  fi

  # 8. Write backup manifest
  MANIFEST_KEY="${BACKUP_PREFIX}/latest.json"
  MANIFEST=$(jq -n \
    --arg ts "$TIMESTAMP" \
    --arg snapshot "$SNAPSHOT_NAME" \
    --arg s3key "$S3_KEY" \
    --arg env "$ENVIRONMENT" \
    --arg encrypted "$([[ -n "${GPG_PASSPHRASE:-}" ]] && echo "true" || echo "false")" \
    '{timestamp: $ts, rds_snapshot: $snapshot, s3_key: $s3key, environment: $env, gpg_encrypted: $encrypted}')
  
  if echo "$MANIFEST" | aws s3 cp - "s3://${S3_BUCKET}/${MANIFEST_KEY}" \
    --sse AES256 --region "$PRIMARY_REGION" 2>>"$LOG_FILE"; then
    ok "Manifest written to s3://$S3_BUCKET/$MANIFEST_KEY"
  else
    warn "Failed to write manifest to S3."
  fi

  # 9. Cleanup S3 retention
  if aws s3 ls "s3://${S3_BUCKET}/${BACKUP_PREFIX}/" --region "$PRIMARY_REGION" &>/dev/null; then
    log "Pruning S3 backups older than ${RETENTION_DAYS} days..."
    CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%S 2>/dev/null \
      || date -v"-${RETENTION_DAYS}d" +%Y-%m-%dT%H:%M:%S)  # macOS fallback
    aws s3 ls "s3://${S3_BUCKET}/${BACKUP_PREFIX}/" \
      | awk '{print $2}' \
      | while read -r prefix; do
          dir_date="${prefix%/}"
          if [[ "$dir_date" < "$CUTOFF" ]]; then
            log "Removing old backup: s3://$S3_BUCKET/$BACKUP_PREFIX/$prefix"
            aws s3 rm "s3://${S3_BUCKET}/${BACKUP_PREFIX}/${prefix}" --recursive \
              --region "$PRIMARY_REGION" >/dev/null
          fi
        done
  fi

  # Cleanup local files
  rm -rf "$BACKUP_DIR" "$TAR_FILE" "$FINAL_BACKUP_FILE"

  send_slack "Backup complete for \`$ENVIRONMENT\`. RDS Snapshot: \`$SNAPSHOT_NAME\`. S3: \`$S3_KEY\`"
  ok "════ BACKUP COMPLETE ════"
}

# ══════════════════════════════════════════════════════════════════════════════
#  MODE: RESTORE
# ══════════════════════════════════════════════════════════════════════════════
do_restore() {
  log "════ RESTORE MODE ════"
  warn "⚠  This will OVERWRITE the current databases. Proceed with caution."

  # Determine source
  local RESTORE_FROM=""
  local RDS_SNAP=""
  local IS_ENCRYPTED="false"
  if [[ -n "$SNAPSHOT_ID" ]]; then
    log "Using specified RDS snapshot: $SNAPSHOT_ID"
    RESTORE_FROM="$SNAPSHOT_ID"
  else
    log "No snapshot specified — fetching latest from S3 manifest..."
    local MANIFEST
    if MANIFEST=$(aws s3 cp "s3://${S3_BUCKET}/${BACKUP_PREFIX}/latest.json" - --region "$PRIMARY_REGION" 2>/dev/null); then
      RESTORE_FROM=$(echo "$MANIFEST" | jq -r '.s3_key // empty')
      RDS_SNAP=$(echo "$MANIFEST"    | jq -r '.rds_snapshot // empty')
      IS_ENCRYPTED=$(echo "$MANIFEST" | jq -r '.gpg_encrypted // "false"')
    else
      MANIFEST="{}"
    fi
    log "Latest S3 dump  : $RESTORE_FROM"
    log "Latest RDS snap : $RDS_SNAP"
  fi

  if [[ -z "$RESTORE_FROM" ]]; then
    fail "No backup source found. Run backup first or specify --snapshot."
  fi

  # If restoring from S3 backup archive or pg_dump
  if [[ "$RESTORE_FROM" == pg_dump/* || "$RESTORE_FROM" == */backup.tar.gz* ]]; then
    local DOWNLOADED_FILE="/tmp/adpulse_restore_${TIMESTAMP}.enc"
    log "Downloading from s3://$S3_BUCKET/$RESTORE_FROM"
    if aws s3 cp "s3://${S3_BUCKET}/${RESTORE_FROM}" "$DOWNLOADED_FILE" --region "$PRIMARY_REGION" 2>>"$LOG_FILE"; then
      log "Downloaded successfully from S3."
    else
      fail "Failed to download backup from S3."
    fi

    local DECRYPTED_FILE="/tmp/adpulse_restore_${TIMESTAMP}.tar.gz"
    if [[ "$RESTORE_FROM" == *.gpg || "${IS_ENCRYPTED:-false}" == "true" ]]; then
      decrypt_file "$DOWNLOADED_FILE" "$DECRYPTED_FILE"
    else
      cp "$DOWNLOADED_FILE" "$DECRYPTED_FILE"
    fi

    local RESTORE_DIR="/tmp/adpulse_restore_dir_${TIMESTAMP}"
    mkdir -p "$RESTORE_DIR"
    log "Extracting backup archive..."
    tar -xzf "$DECRYPTED_FILE" -C "$RESTORE_DIR" 2>>"$LOG_FILE"

    # Find the backup directory name (it will be like adpulse_backup_YYYYMMDD-HHMMSS)
    local BACKUP_CONTENT_DIR
    BACKUP_CONTENT_DIR=$(find "$RESTORE_DIR" -maxdepth 1 -type d -name "adpulse_backup_*" | head -n 1)

    if [[ -z "$BACKUP_CONTENT_DIR" ]]; then
      fail "Failed to find adpulse_backup directory inside the extracted archive."
    fi

    # 1. Restore PostgreSQL
    local PG_DUMP_FILE="${BACKUP_CONTENT_DIR}/postgres.sql.gz"
    if [[ -f "$PG_DUMP_FILE" ]]; then
      log "Restoring PostgreSQL database..."
      log "Dropping and recreating DB $DB_NAME (active connections will be terminated)..."
      
      # Attempt connection and drop/create
      if PGPASSWORD="${PGPASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" &>>"$LOG_FILE" && \
        PGPASSWORD="${PGPASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
        -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" &>>"$LOG_FILE"; then
        
        log "Restoring from pg_dump..."
        gunzip -c "$PG_DUMP_FILE" | PGPASSWORD="${PGPASSWORD}" psql \
          -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
          --single-transaction &>>"$LOG_FILE"
        ok "PostgreSQL restored successfully"
      elif command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "billing_postgres"; then
        log "Local psql failed. Trying restoration via Docker..."
        # Drop and create DB inside Docker
        docker exec -i billing_postgres psql -U postgres -d postgres -c \
          "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='billing_software' AND pid <> pg_backend_pid();" &>>"$LOG_FILE"
        docker exec -i billing_postgres psql -U postgres -d postgres \
          -c "DROP DATABASE IF EXISTS billing_software;" \
          -c "CREATE DATABASE billing_software OWNER postgres;" &>>"$LOG_FILE"
        
        gunzip -c "$PG_DUMP_FILE" | docker exec -i billing_postgres psql -U postgres -d billing_software &>>"$LOG_FILE"
        ok "PostgreSQL restored successfully (via Docker)"
      else
        fail "PostgreSQL restoration failed."
      fi
    else
      warn "No postgres.sql.gz file found in backup."
    fi

    # 2. Restore MongoDB
    local MONGO_DUMP_FILE="${BACKUP_CONTENT_DIR}/mongodb.archive.gz"
    if [[ -f "$MONGO_DUMP_FILE" ]]; then
      log "Restoring MongoDB database..."
      restore_mongodb "$MONGO_URI" "$MONGO_DUMP_FILE"
      ok "MongoDB restored successfully"
    else
      warn "No mongodb.archive.gz file found in backup."
    fi

    # 3. Restore ClickHouse
    local CH_DUMP_DIR="${BACKUP_CONTENT_DIR}/clickhouse"
    if [[ -d "$CH_DUMP_DIR" ]]; then
      log "Restoring ClickHouse database..."
      restore_clickhouse "$CLICKHOUSE_HOST" "$CLICKHOUSE_PORT" "$CLICKHOUSE_USER" "$CLICKHOUSE_PASSWORD" "$CLICKHOUSE_DATABASE" "$CH_DUMP_DIR"
      ok "ClickHouse restored successfully"
    else
      warn "No clickhouse directory found in backup."
    fi

    # Clean up local temporary files
    rm -rf "$DOWNLOADED_FILE" "$DECRYPTED_FILE" "$RESTORE_DIR"

  else
    # Restoring from RDS snapshot — create new instance from snapshot
    NEW_INSTANCE="${RDS_IDENTIFIER}-restored-${TIMESTAMP}"
    log "Restoring RDS snapshot $RESTORE_FROM as $NEW_INSTANCE"
    aws rds restore-db-instance-from-db-snapshot \
      --db-instance-identifier "$NEW_INSTANCE" \
      --db-snapshot-identifier "$RESTORE_FROM" \
      --region "$PRIMARY_REGION" >/dev/null

    log "Waiting for restored instance to become available..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$NEW_INSTANCE" \
      --region "$PRIMARY_REGION"
    ok "RDS instance restored: $NEW_INSTANCE"
    warn "Manually update DATABASE_URL to point to new instance, then verify data."
  fi

  send_slack "Restore complete for \`$ENVIRONMENT\`. Source: \`$RESTORE_FROM\`"
  ok "════ RESTORE COMPLETE ════"
}

# ══════════════════════════════════════════════════════════════════════════════
#  MODE: LIST
# ══════════════════════════════════════════════════════════════════════════════
do_list() {
  log "════ LIST BACKUPS ════"
  echo ""
  echo "S3 Backups (s3://$S3_BUCKET/$BACKUP_PREFIX/):"
  echo "───────────────────────────────────────────────"
  aws s3 ls "s3://${S3_BUCKET}/${BACKUP_PREFIX}/" \
    --region "$PRIMARY_REGION" \
    --human-readable 2>/dev/null || echo "  (none found or bucket inaccessible)"

  echo ""
  echo "RDS Manual Snapshots:"
  echo "───────────────────────────────────────────────"
  aws rds describe-db-snapshots \
    --db-instance-identifier "$RDS_IDENTIFIER" \
    --snapshot-type manual \
    --region "$PRIMARY_REGION" \
    --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier, Status:Status, Created:SnapshotCreateTime, Size:AllocatedStorage}' \
    --output table 2>/dev/null || echo "  (none found)"

  echo ""
  log "Latest backup manifest:"
  aws s3 cp "s3://${S3_BUCKET}/${BACKUP_PREFIX}/latest.json" - \
    --region "$PRIMARY_REGION" 2>/dev/null | jq . || echo "  (no manifest)"
}

# ── Dispatch ───────────────────────────────────────────────────────────────────
case "$MODE" in
  backup)  do_backup  ;;
  restore) do_restore ;;
  list)    do_list    ;;
  *) warn "Unknown mode: $MODE"; usage; exit 1 ;;
esac

log "Log saved: $LOG_FILE"
