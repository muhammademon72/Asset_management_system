#!/bin/bash
# Auto-push script — watches public/app.html for changes and commits + pushes to GitHub
# Uses an inotify-style polling loop (works on any Linux without needing inotify-tools)
#
# Usage:
#   /home/z/my-project/scripts/auto-push.sh
#
# To stop: Ctrl+C or kill the background process

set -uo pipefail

PROJECT_DIR="/home/z/my-project"
WATCH_FILE="$PROJECT_DIR/public/app.html"
LAST_HASH=""
LOG_FILE="$PROJECT_DIR/scripts/auto-push.log"
CREDENTIAL_HELPER="store"
GITHUB_TOKEN_FILE="$PROJECT_DIR/scripts/.github_token"

# Token stored separately (not in chat history, not in git)
# We re-use the previously-stored credential via git credential-store

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Make sure credential helper is configured
git config --global credential.helper store 2>/dev/null || true

log "🚀 Auto-push watcher started"
log "Watching: $WATCH_FILE"
log "Press Ctrl+C to stop"

# Compute initial hash so we don't commit on startup
if [ -f "$WATCH_FILE" ]; then
  LAST_HASH=$(md5sum "$WATCH_FILE" | awk '{print $1}')
  log "Initial snapshot taken (hash: ${LAST_HASH:0:8}...)"
else
  log "ERROR: $WATCH_FILE does not exist yet"
  exit 1
fi

# Track if this is the first run (skip first change since it's already pushed)
FIRST_RUN=true

while true; do
  sleep 5  # Check every 5 seconds

  if [ ! -f "$WATCH_FILE" ]; then
    log "WARN: File disappeared, skipping..."
    continue
  fi

  CURRENT_HASH=$(md5sum "$WATCH_FILE" | awk '{print $1}')

  # No change
  if [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
    continue
  fi

  # Change detected
  LAST_HASH=$CURRENT_HASH
  log ""
  log "✏️  Change detected (new hash: ${CURRENT_HASH:0:8}...)"

  if [ "$FIRST_RUN" = "true" ]; then
    FIRST_RUN=false
    log "Skipping first change (already in HEAD)"
    continue
  fi

  cd "$PROJECT_DIR" || { log "ERROR: Cannot cd to $PROJECT_DIR"; continue; }

  # Stage all changes
  git add -A 2>&1 | tee -a "$LOG_FILE"

  # Check if anything is staged
  if git diff --cached --quiet; then
    log "No staged changes, skipping commit."
    continue
  fi

  # Build a meaningful commit message with timestamp + diff summary
  DIFF_SUMMARY=$(git diff --cached --stat | tail -1 | sed 's/^ *//')
  COMMIT_MSG="auto: update $(date '+%Y-%m-%d %H:%M:%S')

$DIFF_SUMMARY"

  # Commit
  if git commit -m "$COMMIT_MSG" 2>&1 | tee -a "$LOG_FILE" | grep -q "main:"; then
    log "✓ Committed"
  else
    log "Commit may have failed — see log"
    continue
  fi

  # Push
  log "Pushing to origin/main..."
  PUSH_OUTPUT=$(GIT_TERMINAL_PROMPT=0 git -c credential.helper=store push origin main 2>&1)
  echo "$PUSH_OUTPUT" >> "$LOG_FILE"

  if echo "$PUSH_OUTPUT" | grep -qE "main -> main|Everything up-to-date"; then
    log "✓ Pushed successfully"
  else
    log "ERROR: Push failed — output:"
    log "$PUSH_OUTPUT"
  fi
done
