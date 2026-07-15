#!/usr/bin/env bash

# Production Deployment & Migration Script
# Run this script on your Ubuntu VPS to build images, migrate your database, and restart services.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}🚀 Starting Production Deploy & Migration 🚀${NC}"
echo -e "${BLUE}===============================================${NC}"

# 1. Rebuild customized images first
echo -e "${YELLOW}[1/3] Building local codebase Docker images...${NC}"
if [ -f "./scripts/build-images-sequential.sh" ]; then
  ./scripts/build-images-sequential.sh
else
  echo -e "Sequential build script not found. Running standard docker-compose build..."
  docker compose build
fi

# 2. Run database migrations using the built web image
echo -e "\n${YELLOW}[2/3] Running Database Migrations via Prisma...${NC}"
# Using docker-compose run inherits all environment variables (including host overrides)
# and runs within the correct container network.
docker compose run --rm langfuse-web npx prisma db push --accept-data-loss

echo -e "${GREEN}✓ Database tables successfully updated!${NC}"

# 3. Restart Docker containers
echo -e "\n${YELLOW}[3/3] Restarting services under Docker Compose...${NC}"
docker compose up -d

echo -e "\n${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 Production Deployment & Migrations Complete! 🎉${NC}"
echo -e "${GREEN}===============================================${NC}"
