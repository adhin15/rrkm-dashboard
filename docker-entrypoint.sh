#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Set DATABASE_URL for Prisma
export DATABASE_URL="file:/app/data/dev.db"

# Sync database schema (create tables if they don't exist)
echo "Syncing database schema..."
npx prisma db push --accept-data-loss >/dev/null 2>&1 || true

# Run the main command (npm start)
exec "$@"
