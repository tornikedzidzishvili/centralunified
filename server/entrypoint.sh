#!/bin/sh
set -e

echo "================================================"
echo "  Central MFO - Unified Platform Server"
echo "================================================"

echo ""
echo "[1/4] Waiting for database to be ready..."
# Additional wait to ensure PostgreSQL is fully ready
sleep 3

echo "[2/4] Creating uploads directory..."
mkdir -p /app/uploads

echo "[3/4] Running database migrations..."
# Use db push for schema sync (handles both new and existing databases)
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push

echo "[4/4] Starting server..."
echo ""
echo "================================================"
echo "  Server is starting on port ${PORT:-3000}"
echo "================================================"
echo ""

exec node index.js
