# Cloudflare Pages Deployment Guide

## Overview

This guide walks you through deploying the Asset Management System to Cloudflare Pages — a free, fast, and reliable hosting platform with unlimited bandwidth.

## Why Cloudflare Pages?

- ✅ **Free** — no monthly cost
- ✅ **Unlimited bandwidth** — no quota limits like Vercel
- ✅ **Auto-deploy** from GitHub
- ✅ **Global CDN** — fast worldwide
- ✅ **Custom domain** — free SSL
- ✅ **Turso DB** — connects directly

## Prerequisites

1. GitHub account (you have: muhammademon72)
2. Cloudflare account (you have: logged in)
3. Turso DB credentials (already configured)

## Step-by-Step Deployment

### Step 1: Push latest code to GitHub

The repo already has:
- `wrangler.toml` — Cloudflare config
- `build:cf` script in package.json
- Turso fallback credentials hardcoded

Verify by running:
```bash
git log --oneline -3
```

### Step 2: Create Pages Project on Cloudflare

1. Go to https://dash.cloudflare.com
2. Click **"Workers & Pages"** in the left sidebar
3. Click **"Create application"** → **"Pages"** tab
4. Click **"Connect to Git"**

### Step 3: Connect GitHub Repository

1. Select **GitHub** as your Git provider
2. Authorize Cloudflare to access your GitHub (if not already done)
3. Select the repository: **`muhammademon72/Asset_management_system`**
4. Click **"Begin setup"**

### Step 4: Configure Build Settings

Use these exact settings:

| Field | Value |
|-------|-------|
| **Project name** | `assetsys` (or any name you like) |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build:cf` |
| **Build output directory** | `.next` |
| **Root directory** | `/` (leave default) |

### Step 5: Add Environment Variables

In the **"Environment variables"** section, add these (click "Add variable" for each):

```
Variable name: DATABASE_URL
Value: libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io
Type: Plaintext

Variable name: DATABASE_AUTH_TOKEN
Value: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA
Type: Secret (recommended for security)
```

**Note:** Even if you don't set these, the app has hardcoded Turso fallback and will work.

### Step 6: Save and Deploy

1. Click **"Save and Deploy"**
2. Wait 3-5 minutes for the build to complete
3. Watch the build logs — should see "✓ Compiled successfully"
4. When done, you'll get a URL like: `https://assetsys.pages.dev`

### Step 7: Test the Deployment

1. Open `https://assetsys.pages.dev/app.html`
2. Login with: `admin` / `admin123`
3. Verify data loads from Turso
4. Add a test entry to confirm save works

## Custom Domain (Optional)

To use your own domain (e.g., `assetsys.yourdomain.com`):

1. In Cloudflare Pages → your project → **"Custom domains"** tab
2. Click **"Set up a custom domain"**
3. Enter your domain
4. Follow DNS instructions (Cloudflare will auto-configure if domain is on Cloudflare)
5. SSL is automatically provisioned

## Troubleshooting

### Build fails with "Module not found"

- Check that `package.json` has all dependencies
- Run `npm install` locally to verify

### App loads but shows "Failed to load DB"

- Verify Turso credentials in Environment Variables
- Check Turso DB is accessible: `curl https://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io`

### 404 on /app.html

- Make sure `public/app.html` exists in the repo (it does)
- Cloudflare Pages serves files from `public/` automatically

### Function timeout

- Cloudflare Pages Functions have 30s timeout (free plan)
- For longer operations, consider upgrading

## URLs

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Your project (after deploy):** https://assetsys.pages.dev (or your custom name)
- **Turso DB:** libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io
- **GitHub Repo:** https://github.com/muhammademon72/Asset_management_system

## Cost

- **Cloudflare Pages Free Plan:** $0/month
- **Turso Free Plan:** $0/month (9 GB storage)
- **GitHub Free:** $0/month
- **Total:** $0/month 🎉

## Data Persistence

Your data is stored in Turso (cloud DB) — NOT in Cloudflare Pages. This means:
- ✅ Data is permanent
- ✅ Survives server restarts
- ✅ Multi-region (Turso replicates)
- ✅ 9 GB free storage
- ✅ Automatic backups by Turso
