#!/bin/sh
set -e

echo "================================================"
echo "  Central MFO - Unified Platform Server"
echo "================================================"

echo ""
echo "[1/3] Waiting for database to be ready..."
# Additional wait to ensure PostgreSQL is fully ready
sleep 3

echo "[2/3] Running database migrations..."
# Use db push for schema sync (handles both new and existing databases)
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push

echo "[3/3] Starting server..."
echo ""
echo "================================================"
echo "  Server is starting on port ${PORT:-3000}"
echo "================================================"
echo ""

exec node index.js
