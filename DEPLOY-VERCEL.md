# 🚀 Deploy to Vercel — Setup Guide

This guide walks you through deploying the IT Asset Management System to Vercel with auto-deploy from GitHub.

## ✅ Prerequisites

- A GitHub account with this repo forked/cloned
- A Vercel account (free tier works): https://vercel.com/signup
- A Turso database account (free tier works): https://turso.tech/signup

## 📦 Step 1: Create Turso Cloud Database

This is needed because Vercel serverless functions can't use a local SQLite file. Data must live in a cloud database so it persists across deployments and is shared across browsers/devices.

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login (creates an account if you don't have one)
turso auth login

# Create a database
turso db create it-asset-management

# Get the database URL (save this — you'll need it for Vercel)
turso db show it-asset-management --url
# Output: libsql://it-asset-management-<your-username>.turso.io

# Create an auth token (save this too)
turso db tokens create it-asset-management
# Output: eyJhbGciOi...long-token-string...
```

Write down both values — you'll paste them into Vercel in Step 3.

## 🌐 Step 2: Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Find **"Asset_management_system"** in your GitHub repos
4. Click **"Import"**

Vercel will auto-detect:
- Framework: Next.js
- Build command: `next build`
- Output directory: `.next`
- Install command: `bun install` (or `npm install`)

## ⚙️ Step 3: Set Environment Variables

**CRITICAL** — without these, the app won't work on Vercel.

Scroll down to **"Environment Variables"** and add these two:

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | `libsql://it-asset-management-<your-username>.turso.io` | Production, Preview, Development |
| `DATABASE_AUTH_TOKEN` | `eyJhbGciOi...your-token...` | Production, Preview, Development |

Optional but recommended:

| Name | Value | Purpose |
|------|-------|---------|
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js telemetry |
| `SKIP_ENV_VALIDATION` | `1` | Skip env schema validation |

## 🚀 Step 4: Deploy

Click **"Deploy"**. The first build will take ~2-3 minutes.

Once deployed, you'll get a URL like:
```
https://asset-management-system.vercel.app
```

The app will redirect to `/app.html` automatically.

## 🔄 Auto-Deploy Setup

After the first deploy, Vercel automatically watches your GitHub `main` branch. Every time you push to `main`:

1. Vercel sees the push via webhook
2. Triggers a fresh build
3. Deploys to production if build succeeds
4. Posts a comment on the commit with the deploy URL

To trigger a deploy without code changes, push an empty commit:

```bash
git commit --allow-empty -m "chore: trigger Vercel redeploy"
git push origin main
```

## 🧪 Verify Deployment

After deploy completes:

1. Visit the production URL
2. Login screen should appear
3. Login with username: `admin`, password: `admin123`
4. Sidebar should show all 10 menu items (Dashboard, Branch, Employee, Product, etc.)
5. Add a test branch — it should persist across page refreshes (proves Turso DB is working)

## 🛠️ Troubleshooting

### "DEPLOYMENT_NOT_FOUND" on the URL
- The project was deleted or never deployed. Re-import from GitHub.

### Build fails with "Cannot find module '@libsql/client'"
- Run `bun install` locally and commit `bun.lock` — Vercel needs the lockfile.

### App loads but saves fail with "SQLITE_READONLY"
- The `DATABASE_URL` env var is missing or pointing to a `file:` URL. Vercel can't write to local files — you MUST use a Turso libsql:// URL.

### Login fails with "Invalid username or password"
- The Turso database is empty (first deploy). On first GET `/api/db`, the server auto-seeds the default admin user (`admin` / `admin123`). Wait 30s and reload.

### Old cached version showing
- Append `?v=2` to the URL to bypass cache, or do a hard refresh (Ctrl+Shift+R).

### Sidebar menu not rendering
- Fixed in commit `bbb1193` (em-dash syntax error in renderBranchList). Make sure your local main is at or past this commit before pushing.

## 📋 Production Checklist

- [ ] Turso database created
- [ ] `DATABASE_URL` set on Vercel
- [ ] `DATABASE_AUTH_TOKEN` set on Vercel
- [ ] First deploy successful
- [ ] Login screen appears at the production URL
- [ ] Login as `admin` / `admin123` works
- [ ] Sidebar shows all 10 menu items
- [ ] Adding a branch persists after page refresh
- [ ] Custom domain configured (optional)
- [ ] GitHub push triggers auto-deploy (verify by pushing an empty commit)
