# Deploy to SolidHosting (assets-ys.com) — Step-by-Step Guide

## Overview

Your domain `assets-ys.com` is hosted on SolidHosting with Name Servers:
- `in.solidhosting.pro`
- `eu.solidhosting.pro`

We've created PHP proxy files that replace the Next.js API routes, so your
single-file `app.html` will work on SolidHosting's shared cPanel hosting
without needing Node.js.

## What's Included

1. **`public/app.html`** — your full single-file app (no changes needed)
2. **`public/api/db.php`** — PHP proxy that talks to Turso DB
3. **`public/api/attachment.php`** — PHP proxy for attachment storage
4. **`public/.htaccess`** — routing + cache + SSL + security headers

## Step 1: Get Your SolidHosting cPanel Access

You should have received cPanel credentials from SolidHosting. Look for:
- cPanel URL (usually `https://your-server:2083` or similar)
- Username
- Password

If you don't have these, contact SolidHosting support or check your email.

## Step 2: Login to cPanel

1. Go to your cPanel URL
2. Login with your credentials
3. Find the **"File Manager"** icon (usually under "Files" section)
4. Click it to open

## Step 3: Navigate to public_html

1. In File Manager, click on **`public_html`** folder (left sidebar)
2. This is your website's root directory
3. Everything you put here is accessible at `https://assets-ys.com/`

## Step 4: Upload Files

You need to upload these 4 files to `public_html`:

### Method A: Upload via File Manager (easier)

1. Open `public_html` folder
2. Click **"Upload"** button (top right)
3. Upload each file one by one:
   - `app.html` (from `public/app.html`)
   - `.htaccess` (from `public/.htaccess`) — note: this is a hidden file
   - `api/db.php` (create `api` folder first, then upload inside)
   - `api/attachment.php`

**Important for .htaccess:**
- In File Manager, click **"Settings"** (top right) → check **"Show Hidden Files"**
- Then you can see `.htaccess` files

### Method B: Create ZIP and Extract (faster)

1. On your computer, create a ZIP file containing:
   ```
   app.html
   .htaccess
   api/db.php
   api/attachment.php
   ```
2. Upload the ZIP to `public_html`
3. Right-click the ZIP → **"Extract"**
4. Delete the ZIP file after extraction

## Step 5: Create the Database Tables in Turso

The PHP proxy expects these tables in your Turso DB:

```sql
CREATE TABLE IF NOT EXISTS app_data (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  filetype TEXT NOT NULL DEFAULT 'File',
  filesize TEXT,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**You don't need to run these manually** — I've already verified that your
Turso DB has these tables. The backup data is also already in Turso.

## Step 6: Test Your Website

After uploading, visit:
- **https://assets-ys.com/app.html** (main app)
- **https://assets-ys.com/api/db?id=main** (API test — should return JSON)

Login with: **admin** / **admin123**

## Step 7: SSL Setup (Important!)

For HTTPS to work, you need SSL. SolidHosting offers free Let's Encrypt SSL:

1. In cPanel, find **"SSL/TLS Status"** or **"Let's Encrypt SSL"**
2. Click **"Run AutoSSL"** or issue a certificate for `assets-ys.com`
3. Wait 5-10 minutes for the certificate to be issued
4. Once issued, your site will be available at `https://assets-ys.com`

## How It Works

```
User Browser (assets-ys.com/app.html)
    ↓
    ↓ user types/clicks in app
    ↓
    ↓ fetch('/api/db', ...) — relative URL
    ↓
SolidHosting Apache server
    ↓
    ↓ .htaccess rewrites /api/db → /api/db.php
    ↓
api/db.php (PHP proxy)
    ↓
    ↓ curl POST to Turso HTTP API
    ↓
Turso Cloud DB (permanent storage)
    ↓
    ↓ returns JSON
    ↓
api/db.php → echo JSON → browser
    ↓
User sees data on screen
```

## Cost

- **SolidHosting plan:** Your existing plan (already paid)
- **Turso DB:** Free (9 GB)
- **Domain:** Already paid (assets-ys.com)
- **Total monthly:** $0 extra

## Troubleshooting

### Site shows "404 Not Found"

- Make sure `app.html` is in `public_html` (not in a subfolder)
- Check `.htaccess` is uploaded and shows in File Manager (enable "Show Hidden Files")

### Login fails or shows "Failed to load DB"

- Visit `https://assets-ys.com/api/db?id=main` directly
- If you see PHP errors, check that cURL extension is enabled in cPanel → "Select PHP Version"
- If you see JSON with `ok: true`, the proxy works — the issue is in app.html

### Attachments don't upload

- Check `api/attachment.php` exists
- Verify `php_value upload_max_filesize 10M` in .htaccess (already set)
- If still failing, check cPanel error logs

### "Parse error: syntax error" in PHP

- SolidHosting's PHP version might be too old
- In cPanel → "Select PHP Version" → set PHP to 7.4 or higher (8.1+ recommended)

## Files Reference

| File | Purpose | Required? |
|------|---------|-----------|
| `public_html/app.html` | Main application (single-file) | ✅ Yes |
| `public_html/.htaccess` | Routing + security + cache | ✅ Yes |
| `public_html/api/db.php` | Database API proxy (Turso) | ✅ Yes |
| `public_html/api/attachment.php` | Attachment storage proxy (Turso) | ✅ Yes |

## Support

If you encounter issues:
1. Check cPanel error logs (cPanel → "Errors" or "Error Log")
2. Verify all 4 files are uploaded correctly
3. Make sure PHP version is 7.4+ (8.1+ recommended)
4. Confirm cURL extension is enabled in PHP

The app will work on SolidHosting's shared hosting — no Node.js needed!
