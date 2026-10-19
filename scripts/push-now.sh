#!/bin/bash
# One-shot push script — commits any changes and pushes to GitHub.
# Use this after making edits to push them to the remote.
#
# Usage:
#   /home/z/my-project/scripts/push-now.sh "optional commit message"

set -uo pipefail

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/scripts/auto-push.log"

cd "$PROJECT_DIR" || { echo "ERROR: Cannot cd to $PROJECT_DIR"; exit 1; }

# Configure credential helper (idempotent)
git config --global credential.helper store 2>/dev/null || true

# Custom commit message (or auto-generated from timestamp + diff summary)
CUSTOM_MSG="${1:-}"
if [ -z "$CUSTOM_MSG" ]; then
  DIFF_SUMMARY=$(git diff --stat 2>/dev/null | tail -1 | sed 's/^ *//')
  if [ -z "$DIFF_SUMMARY" ]; then DIFF_SUMMARY="(no changes summary)"; fi
  CUSTOM_MSG="auto: update $(date '+%Y-%m-%d %H:%M:%S')

$DIFF_SUMMARY"
fi

# Stage all changes
git add -A

# Check if anything is staged
if git diff --cached --quiet; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] No changes to commit."
  exit 0
fi

# Commit
COMMIT_OUTPUT=$(git commit -m "$CUSTOM_MSG" 2>&1)
echo "$COMMIT_OUTPUT"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] $COMMIT_OUTPUT" >> "$LOG_FILE"

# Push
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pushing to origin/main..."
PUSH_OUTPUT=$(GIT_TERMINAL_PROMPT=0 git -c credential.helper=store push origin main 2>&1)
echo "$PUSH_OUTPUT"
echo "$PUSH_OUTPUT" >> "$LOG_FILE"

if echo "$PUSH_OUTPUT" | grep -qE "main -> main|Everything up-to-date|->"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Pushed successfully" | tee -a "$LOG_FILE"
  exit 0
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Push failed" | tee -a "$LOG_FILE"
  exit 1
fi
