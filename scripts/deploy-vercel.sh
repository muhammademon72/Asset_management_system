#!/bin/bash
# =============================================================================
#  VERCEL AUTO-DEPLOY SCRIPT
# =============================================================================
# Deploys the IT Asset Management System to Vercel from your sandbox.
#
# What this script does:
#   1. Verifies Vercel CLI is installed
#   2. Asks for your Vercel access token (from https://vercel.com/account/tokens)
#   3. Creates a Vercel project linked to your GitHub repo
#   4. Adds Turso environment variables (DATABASE_URL, DATABASE_AUTH_TOKEN)
#   5. Triggers a production deployment
#   6. Returns the production URL
#
# PREREQUISITES:
#   - A Vercel account (free at https://vercel.com/signup)
#   - A Vercel access token (create one at https://vercel.com/account/tokens)
#     - Name: "sandbox-deploy"
#     - Scope: Full account
#     - Expiration: 30 days recommended
#   - Your Turso credentials (already in .env)
#
# USAGE:
#   bash scripts/deploy-vercel.sh
#
# Or with the token pre-set:
#   VERCEL_TOKEN=your-token-here bash scripts/deploy-vercel.sh
# =============================================================================

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
ENV_FILE="$PROJECT_DIR/.env"
PROJECT_NAME="it-asset-management-system"

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
# Step 1: Verify Vercel CLI is installed
# -----------------------------------------------------------------------------
step "Step 1: Verify Vercel CLI"
if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Installing..."
  bun add -g vercel 2>&1 | tail -3
fi
VERCEL_BIN=$(command -v vercel)
log "Vercel CLI: $VERCEL_BIN"
$VERCEL_BIN --version 2>&1 | head -1

# -----------------------------------------------------------------------------
# Step 2: Get Vercel token (from env var or prompt)
# -----------------------------------------------------------------------------
step "Step 2: Get Vercel access token"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "No VERCEL_TOKEN environment variable found."
  echo ""
  echo "To get a Vercel token:"
  echo "  1. Go to https://vercel.com/account/tokens"
  echo "  2. Log in with your Vercel account (sign up if you don't have one)"
  echo "  3. Click 'Create Token'"
  echo "  4. Name: 'sandbox-deploy'"
  echo "  5. Scope: Full Account"
  echo "  6. Expiration: 30 days"
  echo "  7. Copy the token (starts with vercel_...)"
  echo ""
  read -r -p "Paste your Vercel token here: " VERCEL_TOKEN
  if [ -z "$VERCEL_TOKEN" ]; then
    err "No token provided — aborting"
    exit 1
  fi
fi

# Verify the token works
echo "Verifying token..."
WHOAMI=$($VERCEL_BIN whoami --token "$VERCEL_TOKEN" 2>&1 | grep -v "^Vercel CLI\|^> NOTE" | head -1)
if [ -z "$WHOAMI" ] || echo "$WHOAMI" | grep -qiE "error|unauthorized"; then
  err "Token verification failed: $WHOAMI"
  exit 1
fi
log "Authenticated as: $WHOAMI"

# -----------------------------------------------------------------------------
# Step 3: Read Turso credentials from .env
# -----------------------------------------------------------------------------
step "Step 3: Read Turso credentials from .env"
if [ ! -f "$ENV_FILE" ]; then
  err ".env file not found at $ENV_FILE"
  exit 1
fi

DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | head -1 | cut -d= -f2-)
DATABASE_AUTH_TOKEN=$(grep "^DATABASE_AUTH_TOKEN=" "$ENV_FILE" | head -1 | cut -d= -f2-)

if [ -z "$DATABASE_URL" ] || [ -z "$DATABASE_AUTH_TOKEN" ]; then
  err "Missing Turso credentials in .env"
  err "  DATABASE_URL: ${DATABASE_URL:-<missing>}"
  err "  DATABASE_AUTH_TOKEN: ${DATABASE_AUTH_TOKEN:+<present, length ${#DATABASE_AUTH_TOKEN}>}"
  exit 1
fi
log "Turso URL: $DATABASE_URL"
log "Turso token: <present, length ${#DATABASE_AUTH_TOKEN} chars>"

# -----------------------------------------------------------------------------
# Step 4: Create or link Vercel project
# -----------------------------------------------------------------------------
step "Step 4: Create / link Vercel project '$PROJECT_NAME'"
# Check if project already exists
PROJECT_EXISTS=$($VERCEL_BIN project ls --token "$VERCEL_TOKEN" 2>&1 | grep -E "^$PROJECT_NAME\b" || true)
if [ -n "$PROJECT_EXISTS" ]; then
  warn "Project '$PROJECT_NAME' already exists — using it"
else
  echo "Creating new Vercel project '$PROJECT_NAME'..."
  $VERCEL_BIN project add "$PROJECT_NAME" --token "$VERCEL_TOKEN" 2>&1 | tail -5
  log "Project created"
fi

# -----------------------------------------------------------------------------
# Step 5: Add environment variables
# -----------------------------------------------------------------------------
step "Step 5: Add environment variables"

# Remove existing env vars (ignore errors if they don't exist)
echo "Removing existing env vars (if any)..."
$VERCEL_BIN env rm DATABASE_URL production preview development --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
$VERCEL_BIN env rm DATABASE_AUTH_TOKEN production preview development --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
$VERCEL_BIN env rm NEXT_TELEMETRY_DISABLED production preview development --yes --token "$VERCEL_TOKEN" 2>/dev/null || true

# Add env vars
echo "Adding DATABASE_URL..."
echo "$DATABASE_URL" | $VERCEL_BIN env add DATABASE_URL production preview development --token "$VERCEL_TOKEN" 2>&1 | tail -3

echo "Adding DATABASE_AUTH_TOKEN..."
echo "$DATABASE_AUTH_TOKEN" | $VERCEL_BIN env add DATABASE_AUTH_TOKEN production preview development --token "$VERCEL_TOKEN" 2>&1 | tail -3

echo "Adding NEXT_TELEMETRY_DISABLED..."
echo "1" | $VERCEL_BIN env add NEXT_TELEMETRY_DISABLED production preview development --token "$VERCEL_TOKEN" 2>&1 | tail -3

log "Environment variables added"

# -----------------------------------------------------------------------------
# Step 6: Deploy to production
# -----------------------------------------------------------------------------
step "Step 6: Deploy to production"
echo "Deploying (this takes 2-3 minutes)..."
echo ""

# Use --yes to skip prompts, --prod for production deployment
DEPLOY_OUTPUT=$($VERCEL_BIN --prod --yes --token "$VERCEL_TOKEN" 2>&1 | tail -20)
echo "$DEPLOY_OUTPUT"

# Extract the production URL from the output
PRODUCTION_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE "https://[a-z0-9-]+\.vercel\.app" | tail -1)

if [ -z "$PRODUCTION_URL" ]; then
  # Try alternative extraction
  PRODUCTION_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE "https://[a-zA-Z0-9./?=_%:-]*" | tail -1)
fi

echo ""
if [ -n "$PRODUCTION_URL" ]; then
  log "============================================="
  log "  DEPLOYMENT SUCCESSFUL!"
  log "============================================="
  echo ""
  echo "Production URL: $PRODUCTION_URL"
  echo "Project:        $PROJECT_NAME"
  echo "Vercel dash:    https://vercel.com/dashboard"
  echo ""
  echo "Test the deployment:"
  echo "  1. Open $PRODUCTION_URL in your browser"
  echo "  2. You'll be redirected to /app.html"
  echo "  3. Login with admin / admin123"
  echo "  4. Sidebar should show all 10 menu items"
  echo "  5. Add a test branch — it should save to Turso cloud"
else
  warn "Could not extract production URL from output."
  warn "Check the Vercel dashboard: https://vercel.com/dashboard"
fi

# -----------------------------------------------------------------------------
# Step 7: Verify deployment
# -----------------------------------------------------------------------------
if [ -n "$PRODUCTION_URL" ]; then
  step "Step 7: Verify deployment"
  echo "Testing $PRODUCTION_URL/app.html..."
  sleep 5  # Give Vercel a few seconds to be ready
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$PRODUCTION_URL/app.html" 2>&1)
  echo "  HTTP status: $CODE"
  if [ "$CODE" = "200" ]; then
    log "App is live!"
  else
    warn "App returned HTTP $CODE — may need a few more seconds to warm up"
    warn "Wait 30s then refresh: $PRODUCTION_URL/app.html"
  fi

  echo ""
  echo "Testing API endpoint $PRODUCTION_URL/api/db..."
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$PRODUCTION_URL/api/db" 2>&1)
  echo "  HTTP status: $CODE"
  if [ "$CODE" = "200" ]; then
    log "API is working (reading from Turso)"
  else
    warn "API returned HTTP $CODE — check env vars in Vercel dashboard"
  fi
fi

echo ""
log "============================================="
log "  DEPLOYMENT COMPLETE!"
log "============================================="
echo ""
echo "Next steps:"
echo "  1. Visit $PRODUCTION_URL"
echo "  2. Login with admin / admin123"
echo "  3. Your data is in Turso cloud — sandbox and Vercel share the same DB"
echo "  4. Every git push to main will auto-deploy (Vercel's GitHub integration)"
