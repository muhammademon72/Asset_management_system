#!/bin/bash
# =============================================================================
#  TURSO TOKEN ROTATION HELPER
# =============================================================================
# Use this script when you need to rotate (regenerate) your Turso auth token.
#
# WHY ROTATE?
#   - Token was shared in chat/email (security risk)
#   - Periodic rotation (every 90 days) is best practice
#   - Suspected compromise
#   - After employee turnover
#
# USAGE:
#   bash scripts/rotate-turso-token.sh
#
# What this script does:
#   1. Backs up your current .env to .env.bak.<timestamp>
#   2. Shows you current Turso DB URL (preserved)
#   3. Asks for the new auth token
#   4. Updates .env with the new token
#   5. Restarts the dev server
#   6. Tests the connection
#   7. Verifies data is still accessible
#
# PREREQUISITES:
#   - Turso CLI installed and logged in
#     (curl -sSfL https://get.tur.so/install.sh | bash && turso auth login)
#   - New token generated via:
#       turso db tokens create assetmanagementsystem
#     (or via https://turso.tech/app → Database → Settings → Tokens)
# =============================================================================

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
ENV_FILE="$PROJECT_DIR/.env"
TURSO_BIN="${TURSO_BIN:-$HOME/.turso/turso}"
DB_NAME="assetmanagementsystem"  # Your Turso database name

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; }
step() { echo -e "\n${BLUE}▶${NC} $1"; }

cd "$PROJECT_DIR"

# -----------------------------------------------------------------------------
# Step 1: Verify Turso CLI is installed and logged in
# -----------------------------------------------------------------------------
step "Step 1: Verify Turso CLI"

# Make sure turso is on PATH (sandbox restarts wipe PATH)
if [ -x "$HOME/.turso/turso" ] && ! command -v turso >/dev/null 2>&1; then
  export PATH="$HOME/.turso:$PATH"
fi

CLI_AVAILABLE="no"
if [ -x "$TURSO_BIN" ]; then
  CLI_AVAILABLE="yes"
  log "Turso CLI: $TURSO_BIN"
  $TURSO_BIN --version
elif command -v turso >/dev/null 2>&1; then
  CLI_AVAILABLE="yes"
  TURSO_BIN=$(command -v turso)
  log "Turso CLI: $TURSO_BIN"
  $TURSO_BIN --version
else
  warn "Turso CLI not installed"
  warn "Without CLI, you'll need to generate the new token manually via dashboard"
fi

CLI_LOGGED_IN="no"
if [ "$CLI_AVAILABLE" = "yes" ]; then
  WHOAMI_OUT=$($TURSO_BIN auth whoami 2>&1 || true)
  if echo "$WHOAMI_OUT" | grep -qiE "not logged in|please login"; then
    warn "Turso CLI not logged in"
    warn "To enable auto-token-generation: $TURSO_BIN auth login"
  else
    log "Logged in: $(echo "$WHOAMI_OUT" | head -1)"
    CLI_LOGGED_IN="yes"
  fi
fi

# -----------------------------------------------------------------------------
# Step 2: Get the database URL (preserved across token rotation)
# -----------------------------------------------------------------------------
step "Step 2: Get database URL"
DB_URL=""

# Try CLI first
if [ "$CLI_LOGGED_IN" = "yes" ]; then
  DB_NAME="assetmanagementsystem"
  DB_URL=$($TURSO_BIN db show "$DB_NAME" --url 2>&1 | tr -d '[:space:]' | tail -1)
  if [ -z "$DB_URL" ] || echo "$DB_URL" | grep -qiE "error|not logged in"; then
    warn "Could not get URL via CLI: $DB_URL"
    DB_URL=""
  fi
fi

# Fall back to reading current .env
if [ -z "$DB_URL" ] && [ -f "$ENV_FILE" ]; then
  DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '[:space:]')
  if [ -n "$DB_URL" ]; then
    log "Database URL from .env: $DB_URL"
  fi
fi

if [ -z "$DB_URL" ]; then
  err "Could not determine database URL"
  err "Either log in to Turso CLI or set DATABASE_URL in $ENV_FILE first"
  exit 1
fi
log "Database URL: $DB_URL"

# -----------------------------------------------------------------------------
# Step 3: Generate or accept new auth token
# -----------------------------------------------------------------------------
step "Step 3: Generate or accept new auth token"
NEW_TOKEN=""

if [ "$CLI_LOGGED_IN" = "yes" ]; then
  echo "Generating new token via Turso CLI..."
  NEW_TOKEN=$($TURSO_BIN db tokens create "$DB_NAME" 2>&1 | tr -d '[:space:]' | tail -1)
  if [ -z "$NEW_TOKEN" ] || echo "$NEW_TOKEN" | grep -qiE "error|not logged in"; then
    warn "Could not generate token via CLI: $NEW_TOKEN"
    NEW_TOKEN=""
  else
    log "New token generated (length: ${#NEW_TOKEN} chars)"
  fi
fi

if [ -z "$NEW_TOKEN" ]; then
  echo ""
  echo "Please generate a new token via Turso dashboard:"
  echo "  1. Open: https://turso.tech/app"
  echo "  2. Click database: assetmanagementsystem"
  echo "  3. Settings → API Access Tokens → Generate new token"
  echo "  4. Copy the token (starts with eyJhbGci...)"
  echo ""
  read -r -p "Paste new token here: " NEW_TOKEN
  if [ -z "$NEW_TOKEN" ]; then
    err "No token provided — aborting"
    exit 1
  fi
  log "Token received (length: ${#NEW_TOKEN} chars)"
fi

# -----------------------------------------------------------------------------
# Step 4: Backup current .env
# -----------------------------------------------------------------------------
step "Step 4: Backup current .env"
if [ -f "$ENV_FILE" ]; then
  BACKUP="$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"
  cp "$ENV_FILE" "$BACKUP"
  log "Backed up to: $BACKUP"
else
  warn "No existing .env file — creating a new one"
fi

# -----------------------------------------------------------------------------
# Step 6: Write new .env with rotated token
# -----------------------------------------------------------------------------
step "Step 5: Update .env with new token"
cat > "$ENV_FILE" <<EOF
# Turso cloud database — primary data storage
# Source of truth for all app data; survives sandbox restarts and works
# across browsers / devices / Vercel deployments.
# Last token rotation: $(date '+%Y-%m-%d %H:%M:%S')
DATABASE_URL=$DB_URL
DATABASE_AUTH_TOKEN=$NEW_TOKEN
EOF
log "Updated $ENV_FILE"

echo ""
echo "New .env contents (token hidden):"
sed 's/\(AUTH_TOKEN=\).*/\1<hidden>/' "$ENV_FILE" | sed 's/^/  /'

# -----------------------------------------------------------------------------
# Step 7: Restart dev server
# -----------------------------------------------------------------------------
step "Step 6: Restart dev server"
echo "Killing existing dev server..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 3

echo "Starting fresh dev server with new token..."
cd "$PROJECT_DIR"
setsid bash -c './.zscripts/dev.sh > /tmp/rotate-dev.log 2>&1' < /dev/null &
disown

echo "Waiting for dev server to be ready..."
for i in $(seq 1 30); do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000/ 2>/dev/null || echo "0")
  if [ "$CODE" = "307" ] || [ "$CODE" = "200" ]; then
    log "Dev server ready (HTTP $CODE) after ${i}s"
    break
  fi
  sleep 1
done

# -----------------------------------------------------------------------------
# Step 8: Test the new token works
# -----------------------------------------------------------------------------
step "Step 7: Verify new token works"
echo "Testing GET /api/db (should read from Turso with new token)..."
GET_RESP=$(curl -sS http://localhost:3000/api/db 2>&1)
echo "$GET_RESP" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
    if d.get('ok'):
        data = d.get('data', {})
        print(f'  ✓ Status: ok')
        print(f'  ✓ Updated at: {d.get(\"updatedAt\")}')
        print(f'  ✓ Collections: {len(data)} keys')
        # Show counts for key collections
        for k in ['users','roles','conditions','warranties','branches','products']:
            v = data.get(k, [])
            if isinstance(v, list):
                print(f'    {k}: {len(v)} item(s)')
        print()
        print('  ✓ New token works — data accessible')
    else:
        print(f'  ✗ Error: {d}')
        sys.exit(1)
except Exception as e:
    print(f'  ✗ Could not parse response: {e}')
    sys.exit(1)
"

# -----------------------------------------------------------------------------
# Step 9: Revoke the old token (optional but recommended)
# -----------------------------------------------------------------------------
step "Step 8: Revoke old tokens (optional but recommended)"
echo "Your old token may still be valid. To revoke it:"
echo "  1. Go to: https://turso.tech/app"
echo "  2. Select database: $DB_NAME"
echo "  3. Click Settings → Tokens"
echo "  4. Delete any tokens you don't recognize"
echo ""
echo "Or via CLI (lists all tokens):"
echo "  $TURSO_BIN db tokens list $DB_NAME"
echo ""

log "============================================="
log "  TOKEN ROTATION COMPLETE!"
log "============================================="
echo ""
echo "Summary:"
echo "  Database URL: $DB_URL"
echo "  New token:    <hidden, length ${#NEW_TOKEN} chars>"
echo "  Updated:      $ENV_FILE"
echo "  Backup:       $ENV_FILE.bak.*"
echo ""
echo "IMPORTANT — if you have Vercel deployed:"
echo "  1. Go to https://vercel.com/dashboard"
echo "  2. Select your project → Settings → Environment Variables"
echo "  3. Update DATABASE_AUTH_TOKEN with the new value"
echo "  4. Trigger a redeploy (push empty commit or click Redeploy)"
echo ""
echo "The new token is in your local .env file (gitignored, not in git)."
echo "Use 'cat $ENV_FILE' to view it."
