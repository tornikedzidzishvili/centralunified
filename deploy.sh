#!/bin/bash
set -e

echo "========================================"
echo "  Central MFO - Deployment Script"
echo "========================================"
echo ""

# Pull latest code
echo "[1/5] Pulling latest code..."
git pull origin main

# Stop existing containers
echo "[2/5] Stopping containers..."
docker-compose down

# Rebuild containers with new code
echo "[3/5] Building containers..."
docker-compose build --no-cache

# Start containers
echo "[4/5] Starting containers..."
docker-compose up -d

# Wait for services to be ready
echo "[5/5] Waiting for services..."
sleep 10

# Show status
echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
docker-compose ps
echo ""
echo "Logs: docker-compose logs -f"
echo ""
