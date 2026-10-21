# 🔑 Turso Token Rotation Guide

This guide shows you how to rotate (regenerate) your Turso auth token — an important security step after a token has been shared in chat, email, or any unsecured channel.

## 🚀 Quick Rotation (Automated)

Just run this one command:

```bash
cd /home/z/my-project
bash scripts/rotate-turso-token.sh
```

The script does everything for you:
1. Verifies Turso CLI is installed and logged in
2. Verifies your database exists
3. Generates a new auth token
4. Backs up current `.env` to `.env.bak.<timestamp>`
5. Updates `.env` with the new token (preserves your DB URL)
6. Restarts the dev server
7. Tests the new token works (verifies data is still accessible)
8. Tells you how to revoke the old token

**Total time: ~10 seconds.**

## 📋 Manual Rotation (Step by Step)

If you prefer to do it manually:

### Step 1: Open Turso Dashboard

1. Go to: https://turso.tech/app
2. Sign in with your account
3. You should see your database `assetmanagementsystem` in the list

### Step 2: Generate New Token

**Option A — Via Dashboard (easier):**
1. Click on your database name: `assetmanagementsystem`
2. Click **Settings** in the top menu
3. Scroll down to **API Access Tokens** section
4. Click **Generate new token**
5. Give it a name (e.g., "production-2026-10")
6. Copy the token immediately — Turso won't show it again

**Option B — Via Turso CLI:**
```bash
# Install CLI if not installed
curl -sSfL https://get.tur.so/install.sh | bash
export PATH="$HOME/.turso:$PATH"

# Login (opens browser)
turso auth login

# Generate new token
turso db tokens create assetmanagementsystem
```

### Step 3: Update Local `.env`

Edit `/home/z/my-project/.env` and replace `DATABASE_AUTH_TOKEN` value:

```bash
# Before (old token)
DATABASE_URL=libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io
DATABASE_AUTH_TOKEN=eyJhbGciOiJFZERTQSIs...OLD_TOKEN...

# After (new token)
DATABASE_URL=libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io
DATABASE_AUTH_TOKEN=eyJhbGciOiJFZERTQSIs...NEW_TOKEN...
```

**Note:** The `DATABASE_URL` stays the same — only the token changes.

### Step 4: Restart Dev Server

```bash
cd /home/z/my-project
pkill -f "next dev"
pkill -f "next-server"
sleep 2
setsid bash -c './.zscripts/dev.sh' &
```

Wait ~5 seconds, then verify:

```bash
curl http://localhost:3000/api/db
```

Should return `{"ok":true,"data":{...},"updatedAt":"..."}`.

### Step 5: Revoke Old Tokens

**Via Dashboard:**
1. Go to your database on https://turso.tech/app
2. Settings → API Access Tokens
3. Click the **trash icon** next to any old tokens

**Via CLI:**
```bash
turso db tokens list assetmanagementsystem
# (lists all active tokens)

# To revoke a specific token by ID:
turso db tokens revoke assetmanagementsystem <token-id>
```

### Step 6: Update Vercel (if deployed)

If you've deployed to Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Find `DATABASE_AUTH_TOKEN`
5. Click the **...** menu → **Edit**
6. Paste the new token value
7. Click **Save**
8. Trigger a redeploy:
   - Either push an empty commit: `git commit --allow-empty -m "chore: rotate Turso token" && git push`
   - Or click **Redeploy** in Vercel dashboard

## 📅 When to Rotate

Rotate your Turso token:

| Trigger | Action |
|---------|--------|
| Token was shared in chat/email | **Immediately** |
| Every 90 days (best practice) | Scheduled |
| After employee turnover | **Immediately** |
| Suspicious activity | **Immediately** |
| After major version upgrades | Optional |

## 🆘 Troubleshooting

### "Cannot connect to Turso after rotation"
- Verify the new token was pasted correctly (no extra whitespace)
- Verify `DATABASE_URL` is unchanged
- Restart the dev server
- Check dev.log for errors: `tail -50 /home/z/my-project/dev.log`

### "Old token still works after rotation"
- Turso tokens don't auto-expire. You MUST revoke the old token manually:
  - Via dashboard: trash icon next to the old token
  - Via CLI: `turso db tokens revoke assetmanagementsystem <token-id>`

### "App shows empty data after rotation"
- The token itself doesn't affect data — only access to it
- If data is missing, check:
  - You're using the same database URL
  - The database wasn't deleted accidentally
- Run: `turso db list` to confirm the DB exists

### "Vercel build fails after token update"
- Verify the new token was saved in Vercel env vars (Settings → Environment Variables)
- Trigger a fresh deploy (not just a cache hit)
- Check Vercel build logs — the API route should print clear error messages

## 🔐 Security Best Practices

1. **Never commit `.env` to git** — it's gitignored (verify with `git status .env`)
2. **Rotate every 90 days** — set a calendar reminder
3. **Use descriptive token names** — e.g., "sandbox-2026-10", "vercel-production"
4. **Revoke unused tokens** — old tokens remain valid indefinitely
5. **Don't share tokens in chat** — use a password manager or secret store
6. **Audit periodically** — `turso db tokens list assetmanagementsystem`

## 📚 Useful Turso Token Commands

```bash
# List all active tokens
turso db tokens list assetmanagementsystem

# Create a new token
turso db tokens create assetmanagementsystem

# Revoke a specific token
turso db tokens revoke assetmanagementsystem <token-id>

# Invalidate ALL tokens (DANGER — locks out everything)
turso db tokens invalidate assetmanagementsystem
```
