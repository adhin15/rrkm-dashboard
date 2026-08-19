#!/usr/bin/env bash
# Self-hosted CI/CD deploy script for rrkm.selianahq.com
# Triggered by GitHub webhook on push to main

set -euo pipefail

PROJECT_DIR="/home/odysseus/projects/web-app/rrkm-dashboard"
LOG_FILE="/home/odysseus/projects/web-app/rrkm-dashboard/logs/rrkm-deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log "=== RRKM Deploy triggered ==="

# Use the mounted SSH key for GitHub access
export GIT_SSH_COMMAND="ssh -i /home/odysseus/.ssh/id_ed25519 -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=accept-new"

# Step 1: Pull latest code
cd "$PROJECT_DIR"
log "Pulling latest code from origin/main..."

# Fix git dubious ownership when running inside Docker
git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

git fetch origin main 2>&1 || { log "ERROR: git fetch failed"; exit 1; }
git reset --hard origin/main 2>&1 || { log "ERROR: git reset failed"; exit 1; }

# Get the latest commit hash
COMMIT=$(git rev-parse --short HEAD)
log "Deployed commit: ${COMMIT}"

# Step 2: Build and restart Docker container
log "Building and restarting RRKM container..."
# Cap build memory to 1.5g so a heavy build can't OOM the 3.8GB VPS
docker compose -f "$PROJECT_DIR/compose.yaml" build --memory 1.5g 2>&1 || { log "ERROR: docker compose build failed"; exit 1; }
docker compose -f "$PROJECT_DIR/compose.yaml" up -d 2>&1 || { log "ERROR: docker compose up failed"; exit 1; }

log "=== RRKM Deploy complete (${COMMIT}) ==="
