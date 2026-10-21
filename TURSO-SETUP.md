# 🗄️ Turso Cloud Database Setup Guide

This guide walks you through setting up a Turso cloud database for permanent data storage. Once set up, your data will persist across sandbox restarts and work on Vercel deployments.

## 🚀 Quick Setup (Automated)

### Option A: Interactive Setup (Recommended)

Run the automated setup script — it will:
1. Install Turso CLI
2. Open your browser for Turso login
3. Create a database called `it-asset-management`
4. Generate an auth token
5. Update `.env` with Turso credentials
6. Migrate existing local data to Turso
7. Restart the dev server
8. Verify the cloud DB works

```bash
cd /home/z/my-project
bash scripts/setup-turso.sh
```

The script will open your browser to log in to Turso. Sign up for a free account if you don't have one (takes ~30 seconds with GitHub OAuth).

### Option B: Manual Setup

If the automated script doesn't work, you can set up Turso manually:

#### Step 1: Sign up for Turso

1. Go to: https://turso.tech/signup
2. Sign up with GitHub or email
3. Verify your account

#### Step 2: Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
export PATH="$HOME/.turso:$PATH"
```

#### Step 3: Login

```bash
turso auth login
```

This opens your browser. After login, come back to your terminal.

#### Step 4: Create a Database

```bash
turso db create it-asset-management --wait
```

This takes ~5-10 seconds. The free tier includes 500 databases.

#### Step 5: Get the URL and Token

```bash
# Get the database URL (looks like: libsql://it-asset-management-<username>.turso.io)
turso db show it-asset-management --url

# Create an auth token
turso db tokens create it-asset-management
```

Copy both values — you'll need them next.

#### Step 6: Update .env

Edit `/home/z/my-project/.env` and replace its content with:

```bash
# Turso cloud database
DATABASE_URL=libsql://it-asset-management-yourusername.turso.io
DATABASE_AUTH_TOKEN=eyJhbGciOi...your-token-here...
```

#### Step 7: Restart the Dev Server

```bash
pkill -f "next dev"
pkill -f "next-server"
sleep 2
cd /home/z/my-project
setsid bash -c './.zscripts/dev.sh' &
```

#### Step 8: Migrate Existing Data (Optional)

If you have existing data in the local SQLite file (`db/custom.db`), push it to Turso:

```bash
# Run the migration helper
python3 << 'EOF'
import sqlite3, json, urllib.request, os

DB_URL = os.popen("grep DATABASE_URL .env | cut -d= -f2").read().strip()
TOKEN  = os.popen("grep DATABASE_AUTH_TOKEN .env | cut -d= -f2").read().strip()

# Read from local SQLite
conn = sqlite3.connect('db/custom.db')
data = json.loads(conn.execute("SELECT data FROM app_data WHERE id='main'").fetchone()[0])
conn.close()

# Push to Turso via the app's own API
import urllib.request
req = urllib.request.Request(
    'http://localhost:3000/api/db',
    data=json.dumps({"data": data}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
resp = urllib.request.urlopen(req).read().decode()
print(f"Migration response: {resp}")
EOF
```

#### Step 9: Verify

Open http://localhost:3000/app.html and log in as `admin` / `admin123`. Add a test branch — it should appear in the Turso cloud DB now.

## 📋 What Turso Gives You

| Feature | Free Tier | Your App Needs |
|---------|-----------|----------------|
| Databases | 500 | 1 |
| Storage | 9 GB | <1 MB currently |
| Row reads | 1 billion/month | ~thousands |
| Row writes | 25 million/month | ~hundreds |
| Locations | 3 regions | 1 |

You'll never hit the free tier limits with this app.

## 🌐 Use the Same Turso DB on Vercel

Once Turso is set up, deploying on Vercel is just adding the same env vars:

1. Go to https://vercel.com/dashboard
2. Import your GitHub repo `Asset_management_system`
3. Add Environment Variables:
   - `DATABASE_URL` = your Turso URL (same as in .env)
   - `DATABASE_AUTH_TOKEN` = your Turso token (same as in .env)
4. Deploy

Both sandbox and Vercel will use the same cloud database — so data is fully synced.

## 🔄 Data Flow After Turso Setup

```
Browser (Chrome/Firefox/Safari)
   ↓ GET /api/db (reads from Turso)
   ↓ POST /api/db (writes to Turso)
Next.js API Route (sandbox OR Vercel)
   ↓
Turso Cloud Database (libsql://...)
   ↑ Survives sandbox restarts ✓
   ↑ Synced across browsers ✓
   ↑ Works on Vercel ✓
```

## 🆘 Troubleshooting

### "Database is empty after setup"
- Run the migration step (Step 8) above to push existing data to Turso.

### "Login failed — browser doesn't open"
- The sandbox has no GUI browser. Use `turso auth login --headless` and visit the printed URL on your own machine.

### "Database creation takes forever"
- The `--wait` flag waits until the DB is ready. This is normal for first creation.

### "App still reads from local file"
- Restart the dev server (kill processes, run `dev.sh`).
- Check `.env` file is correct.
- Check the running process picked up the new env (look in dev.log).

### "Want to switch back to local SQLite"
- Restore `.env` to: `DATABASE_URL=file:db/custom.db`
- Restart the dev server.

## 📚 Useful Turso Commands

```bash
# List your databases
turso db list

# Show database details
turso db show it-asset-management

# Get URL
turso db show it-asset-management --url

# Create new auth token
turso db tokens create it-asset-management

# Run SQL directly on the cloud DB
turso db shell it-asset-management
> SELECT id, length(data), updated_at FROM app_data;
> .quit

# Delete the database (DANGER — destroys all data!)
turso db destroy it-asset-management
```
