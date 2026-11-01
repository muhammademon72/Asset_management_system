#!/bin/bash
# Auto-sync Z.ai → Turso every 30 seconds
# This runs in a loop and restarts itself if it crashes.
# Run with: nohup bash scripts/cron-sync.sh > /tmp/cron-sync.log 2>&1 &

cd /home/z/my-project

while true; do
  echo "[$(date)] Starting sync cycle..."
  node scripts/sync-zai-to-turso.js
  echo "[$(date)] Sync cycle done. Sleeping 30s..."
  sleep 30
done
