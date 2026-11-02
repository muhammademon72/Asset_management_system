#!/bin/bash
# Deploy Asset Management System to Cloudflare Pages
# Run: bash scripts/deploy-to-cloudflare.sh
#
# Prerequisites: Set CLOUDFLARE_API_TOKEN environment variable
# Get token from: https://dash.cloudflare.com/profile/api-tokens
# Use "Edit Cloudflare Workers" template, or create custom with Pages permissions.

set -e

cd /home/z/my-project

echo "=== Cloudflare Pages Deployment ==="
echo ""

# Check for API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set."
  echo ""
  echo "To get your token:"
  echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
  echo "2. Click 'Create Token'"
  echo "3. Use template: 'Edit Cloudflare Workers' (recommended)"
  echo "   OR create custom token with these permissions:"
  echo "   - Account > Cloudflare Pages > Edit"
  echo "   - Account > D1 > Edit (optional, for future use)"
  echo "4. Copy the token value"
  echo "5. Run this command with the token:"
  echo ""
  echo "   CLOUDFLARE_API_TOKEN='your_token_here' bash scripts/deploy-to-cloudflare.sh"
  exit 1
fi

echo "✓ API token found"
echo ""

# Verify token
echo "=== Verifying token... ==="
ACCOUNT_INFO=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$ACCOUNT_INFO" | grep -q '"success":true'; then
  EMAIL=$(echo "$ACCOUNT_INFO" | grep -o '"email":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✓ Token valid. Account: $EMAIL"
else
  echo "❌ Token invalid or expired."
  echo "Response: $ACCOUNT_INFO"
  exit 1
fi

# Get account ID
echo ""
echo "=== Fetching account ID... ==="
ACCOUNTS=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

ACCOUNT_ID=$(echo "$ACCOUNTS" | grep -o '"id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
ACCOUNT_NAME=$(echo "$ACCOUNTS" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ACCOUNT_ID" ]; then
  echo "❌ Could not find account ID"
  echo "Response: $ACCOUNTS"
  exit 1
fi
echo "✓ Account: $ACCOUNT_NAME (ID: $ACCOUNT_ID)"

# Build the project
echo ""
echo "=== Building project... ==="
export DATABASE_URL="libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io"
export DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA"

npm run build:cf 2>&1 | tail -10

if [ ! -d ".next" ]; then
  echo "❌ Build failed — .next directory not found"
  exit 1
fi
echo "✓ Build complete"

# Create the Pages project
echo ""
echo "=== Creating Cloudflare Pages project... ==="
CREATE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "assetsys",
    "production_branch": "main"
  }')

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Project 'assetsys' created"
elif echo "$CREATE_RESPONSE" | grep -q "already exists"; then
  echo "✓ Project 'assetsys' already exists"
else
  echo "⚠️  Project creation response: $CREATE_RESPONSE"
fi

# Deploy using wrangler
echo ""
echo "=== Deploying to Cloudflare Pages... ==="
CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" wrangler pages deploy .next --project-name=assetsys --branch=main 2>&1 | tail -20

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "Your app should be live at:"
echo "  https://assetsys.pages.dev"
echo "  https://assetsys.pages.dev/app.html (main app)"
echo ""
echo "Login: admin / admin123"
