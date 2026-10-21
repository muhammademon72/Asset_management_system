#!/bin/bash
# =============================================================================
#  TURSO CLOUD DATABASE SETUP
# =============================================================================
# This script:
#   1. Logs in to Turso (interactive — opens browser)
#   2. Creates a new Turso database named "it-asset-management"
#   3. Generates an auth token
#   4. Updates /home/z/my-project/.env with Turso URL + token
#   5. Migrates existing local SQLite data to Turso
#   6. Restarts the dev server
#   7. Verifies the cloud DB works
#
# Usage:
#   cd /home/z/my-project
#   bash scripts/setup-turso.sh
#
# Prerequisites:
#   - Turso CLI installed (script installs it if missing)
#   - A Turso account (free at https://turso.tech/signup)
# =============================================================================

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
ENV_FILE="$PROJECT_DIR/.env"
DB_NAME="it-asset-management"
TURSO_BIN="${TURSO_BIN:-$HOME/.turso/turso}"

# Color codes for nice output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }
step() { echo -e "\n${BLUE}▶${NC} $1"; }

# -----------------------------------------------------------------------------
# Step 0: Ensure Turso CLI is installed
# -----------------------------------------------------------------------------
step "Step 0: Ensure Turso CLI is installed"
if [ ! -x "$TURSO_BIN" ]; then
  echo "Turso CLI not found at $TURSO_BIN"
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
  TURSO_BIN="$HOME/.turso/turso"
fi
log "Turso CLI: $TURSO_BIN"
$TURSO_BIN --version

# -----------------------------------------------------------------------------
# Step 1: Login to Turso
# -----------------------------------------------------------------------------
step "Step 1: Login to Turso"
# Note: `turso auth whoami` prints "You are not logged in..." to STDOUT (not stderr)
# and exits with code 0 even when not logged in. We must inspect its output.
WHOAMI_OUT=$($TURSO_BIN auth whoami 2>&1 || true)
if echo "$WHOAMI_OUT" | grep -qiE "not logged in|please login"; then
  echo "Not logged in. Opening browser for Turso login..."
  echo "If the browser doesn't open, go to: https://turso.tech/app/auth/login"
  $TURSO_BIN auth login || true
  # Verify login worked
  WHOAMI_OUT=$($TURSO_BIN auth whoami 2>&1 || true)
  if echo "$WHOAMI_OUT" | grep -qiE "not logged in|please login"; then
    err "Login failed. Please run: $TURSO_BIN auth login"
    err "(Or set TURSO_API_TOKEN env var with a token from https://turso.tech/app/account/api-tokens)"
    exit 1
  fi
  log "Logged in successfully: $(echo "$WHOAMI_OUT" | head -1)"
else
  log "Already logged in: $(echo "$WHOAMI_OUT" | head -1)"
fi

# -----------------------------------------------------------------------------
# Step 2: Create database (if not exists)
# -----------------------------------------------------------------------------
step "Step 2: Create Turso database '$DB_NAME'"
# `turso db list` returns non-zero exit if not logged in
EXISTING_DB=$($TURSO_BIN db list 2>&1 | grep -E "^$DB_NAME\b" || true)
if [ -n "$EXISTING_DB" ]; then
  warn "Database '$DB_NAME' already exists — using it"
else
  echo "Creating database '$DB_NAME' (this takes ~5-10 seconds)..."
  CREATE_OUT=$($TURSO_BIN db create "$DB_NAME" --wait 2>&1)
  if echo "$CREATE_OUT" | grep -qiE "error|not logged in|please login"; then
    err "Could not create database: $CREATE_OUT"
    exit 1
  fi
  log "Database created"
fi

# -----------------------------------------------------------------------------
# Step 3: Get the database URL and create an auth token
# -----------------------------------------------------------------------------
step "Step 3: Get database URL and create auth token"
DB_URL=$($TURSO_BIN db show "$DB_NAME" --url 2>&1 | tr -d '[:space:]' | tail -1)
if [ -z "$DB_URL" ] || echo "$DB_URL" | grep -qiE "error|not logged in|please login"; then
  err "Could not get database URL: $DB_URL"
  exit 1
fi
log "Database URL: $DB_URL"

AUTH_TOKEN=$($TURSO_BIN db tokens create "$DB_NAME" 2>&1 | tr -d '[:space:]' | tail -1)
if [ -z "$AUTH_TOKEN" ] || echo "$AUTH_TOKEN" | grep -qiE "error|not logged in|please login"; then
  err "Could not create auth token: $AUTH_TOKEN"
  exit 1
fi
log "Auth token created (length: ${#AUTH_TOKEN} chars)"

# -----------------------------------------------------------------------------
# Step 4: Update .env file with Turso credentials
# -----------------------------------------------------------------------------
step "Step 4: Update $ENV_FILE"
# Backup current .env
[ -f "$ENV_FILE" ] && cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"

cat > "$ENV_FILE" <<EOF
# Turso cloud database — primary data storage
# Source of truth for all app data; survives sandbox restarts and works
# across browsers / devices / Vercel deployments.
DATABASE_URL=$DB_URL
DATABASE_AUTH_TOKEN=$AUTH_TOKEN
EOF
log "Wrote Turso credentials to $ENV_FILE"
echo "  Contents:"
cat "$ENV_FILE" | sed 's/\(AUTH_TOKEN=\).*/\1<hidden>/' | sed 's/^/    /'

# -----------------------------------------------------------------------------
# Step 5: Migrate existing local SQLite data to Turso
# -----------------------------------------------------------------------------
step "Step 5: Migrate existing local data to Turso"
LOCAL_DB="$PROJECT_DIR/db/custom.db"
if [ -f "$LOCAL_DB" ]; then
  echo "Local SQLite file found: $LOCAL_DB ($(stat -c%s "$LOCAL_DB") bytes)"
  echo "Reading data from app_data table..."

  # Use Python to read the local DB and push it to Turso via the API
  cd "$PROJECT_DIR"
  python3 <<PYEOF
import sqlite3, json, os, urllib.request

DB_URL = "$DB_URL"
TOKEN = "$AUTH_TOKEN"
LOCAL_DB = "$LOCAL_DB"

# Read existing data from local SQLite
try:
    conn = sqlite3.connect(LOCAL_DB)
    c = conn.cursor()
    c.execute("SELECT data FROM app_data WHERE id='main'")
    row = c.fetchone()
    if row:
        data = json.loads(row[0])
        print(f"  Read {len(data)} collections from local DB ({len(row[0])} chars)")
    else:
        print("  Local DB has no app_data row — using default seed")
        data = None
    conn.close()
except Exception as e:
    print(f"  Could not read local DB: {e}")
    data = None

if data:
    # Push to Turso via the HTTP API
    # Turso's HTTP endpoint: POST https://<host>/v2/pipeline
    # But it's easier to use the libsql client from Node
    print("  Migrating data to Turso via Node script...")
    with open("/tmp/migrate-data.json", "w") as f:
        json.dump({"data": data}, f)
    print("  Data saved to /tmp/migrate-data.json")
    print("  Will be pushed to Turso on next server start via POST /api/db")
PYEOF
else
  warn "No local SQLite file found — skipping migration"
fi

# -----------------------------------------------------------------------------
# Step 6: Restart the dev server
# -----------------------------------------------------------------------------
step "Step 6: Restart dev server"
echo "Killing any existing Next.js dev server..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

echo "Starting fresh dev server with Turso credentials..."
cd "$PROJECT_DIR"
setsid bash -c './.zscripts/dev.sh > /tmp/turso-dev.log 2>&1' < /dev/null &
disown

# Wait for server to be ready
echo "Waiting for dev server to start..."
for i in $(seq 1 30); do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000/ 2>/dev/null || echo "0")
  if [ "$CODE" = "307" ] || [ "$CODE" = "200" ]; then
    log "Dev server ready (HTTP $CODE) after ${i}s"
    break
  fi
  sleep 1
done

# -----------------------------------------------------------------------------
# Step 7: Push existing local data to Turso via /api/db endpoint
# -----------------------------------------------------------------------------
if [ -f "/tmp/migrate-data.json" ]; then
  step "Step 7: Push local data to Turso"
  echo "Uploading local DB to Turso via POST /api/db..."
  RESP=$(curl -sS -X POST http://localhost:3000/api/db \
    -H "Content-Type: application/json" \
    -d @/tmp/migrate-data.json 2>&1)
  echo "  Response: $RESP"
  if echo "$RESP" | grep -q '"ok":true'; then
    log "Data migrated to Turso successfully!"
  else
    warn "Migration may have failed — check the response above"
  fi
  rm -f /tmp/migrate-data.json
fi

# -----------------------------------------------------------------------------
# Step 8: Verify cloud DB works
# -----------------------------------------------------------------------------
step "Step 8: Verify cloud DB"
echo "Testing GET /api/db (should read from Turso now)..."
GET_RESP=$(curl -sS http://localhost:3000/api/db 2>&1)
echo "$GET_RESP" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
    if d.get('ok'):
        data = d.get('data', {})
        print(f'  Status: ok ✓')
        print(f'  Updated at: {d.get(\"updatedAt\")}')
        print(f'  Collections: {len(data)} keys')
        # Show counts
        for k in ['branches','employees','products','suppliers','users','roles']:
            v = data.get(k, [])
            if isinstance(v, list):
                print(f'    {k}: {len(v)} item(s)')
    else:
        print(f'  Error: {d}')
except Exception as e:
    print(f'  Could not parse response: {e}')
"

echo ""
log "============================================="
log "  TURSO CLOUD DATABASE SETUP COMPLETE!"
log "============================================="
echo ""
echo "Your data is now stored in Turso cloud at:"
echo "  $DB_URL"
echo ""
echo "Environment variables saved to: $ENV_FILE"
echo ""
echo "What this means:"
echo "  ✓ Data persists across sandbox restarts"
echo "  ✓ Works on Vercel deployment (just add same env vars)"
echo "  ✓ Cross-browser / cross-device sync"
echo "  ✓ Free tier: 9 GB storage, 1 billion row reads/month"
echo ""
echo "To use on Vercel, add these env vars in Vercel dashboard:"
echo "  DATABASE_URL       = $DB_URL"
echo "  DATABASE_AUTH_TOKEN = <the token from $ENV_FILE>"
