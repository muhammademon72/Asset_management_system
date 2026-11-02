#!/bin/bash
# Static Export Build Script for SolidHosting (cPanel)
# Builds the Next.js app as static files that can be uploaded to cPanel.
# This avoids Node.js requirements on shared hosting.

set -e

cd /home/z/my-project

echo "=== Building Static Export for SolidHosting (cPanel) ==="
echo ""

# Set Turso env vars for build
export DATABASE_URL="libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io"
export DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA"

# Step 1: Clean previous builds
echo "Step 1: Cleaning previous builds..."
rm -rf .next out public-build
echo "✓ Cleaned"

# Step 2: Build static export
echo ""
echo "Step 2: Building static export..."
# Use next build with static export — produces an /out directory
NEXT_STATIC_EXPORT=true npx next build 2>&1 | tail -15

# Step 3: Check if /out directory was created
if [ ! -d "out" ]; then
  echo "⚠️  Static export did not produce /out directory"
  echo "Falling back to copying public/ folder (the app.html single-file app)..."
  mkdir -p public-build
  cp -r public/* public-build/
  echo "✓ Copied public/ to public-build/"
  OUT_DIR="public-build"
else
  echo "✓ Static export created in /out"
  OUT_DIR="out"
fi

# Step 4: Add .htaccess for proper routing on cPanel/Apache
echo ""
echo "Step 4: Creating .htaccess for cPanel..."
cat > "$OUT_DIR/.htaccess" << 'HTACCESS'
# .htaccess for Asset Management System on cPanel/SolidHosting
# Routes all requests to app.html (the single-file app)

RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Redirect root to /app.html
RewriteRule ^$ /app.html [L]

# Cache static assets (1 year)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/html "access plus 1 hour"
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
HTACCESS
echo "✓ .htaccess created"

# Step 5: Create a zip file for easy upload to cPanel
echo ""
echo "Step 5: Creating zip file for cPanel upload..."
rm -f assets-ys-deploy.zip
cd "$OUT_DIR"
zip -r ../assets-ys-deploy.zip . -x ".*" 2>&1 | tail -3
cd ..
echo "✓ Created assets-ys-deploy.zip"

# Step 6: Show summary
echo ""
echo "=== Build Complete ==="
echo ""
echo "Files to upload to cPanel:"
ls -la "$OUT_DIR/" | head -10
echo ""
echo "Zip file: $(ls -la assets-ys-deploy.zip | awk '{print $5}') bytes"
echo ""
echo "Next steps:"
echo "1. Login to your SolidHosting cPanel"
echo "2. Go to File Manager → public_html"
echo "3. Upload assets-ys-deploy.zip"
echo "4. Extract it (right-click → Extract)"
echo "5. Visit https://assets-ys.com/app.html"
echo ""
echo "Login: admin / admin123"
