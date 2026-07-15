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

# 1. Fetch Database URL from configuration
DB_URL=""

if [ -f .env ]; then
  echo -e "${YELLOW}Loading database configuration from .env file...${NC}"
  DB_URL=$(grep -E "^DATABASE_URL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$DB_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL is not defined in your .env file!${NC}"
  echo -e "Please ensure you have a .env file with DATABASE_URL set."
  exit 1
fi

# 2. Rebuild customized images first
echo -e "${YELLOW}[1/4] Building local codebase Docker images...${NC}"
if [ -f "./scripts/build-images-sequential.sh" ]; then
  ./scripts/build-images-sequential.sh
else
  echo -e "Sequential build script not found. Running standard docker-compose build..."
  docker compose build
fi

# 3. Ensure database containers and network are up
echo -e "\n${YELLOW}[2/4] Initializing docker compose database containers & network...${NC}"
# ClickHouse and Redis are part of the compose stack; starting them ensures the default network is created.
docker compose up -d clickhouse redis6380

# 4. Resolve the Docker Compose network name dynamically
NETWORK_NAME=$(docker network ls --filter name=langfuse --format "{{.Name}}" | head -n 1)
if [ -z "$NETWORK_NAME" ]; then
  NETWORK_NAME="langfuse_default"
fi
echo -e "Using docker network: ${BLUE}$NETWORK_NAME${NC}"

# 5. Run database migrations using the lightweight Node.js container inside the Compose network
echo -e "\n${YELLOW}[3/4] Running Database Migrations via Prisma...${NC}"
echo -e "Target Database: ${BLUE}${DB_URL%%:*}:****@${DB_URL#*@}${NC}"

docker run --rm \
  -v "$(pwd)":/app \
  -w /app \
  --network "$NETWORK_NAME" \
  node:22-alpine \
  sh -c "apk add --no-cache bash && npm install -g pnpm && pnpm install --filter=@langfuse/shared && DATABASE_URL=\"$DB_URL\" DIRECT_URL=\"$DB_URL\" npx prisma db push --schema=packages/shared/prisma/schema.prisma --accept-data-loss"

echo -e "${GREEN}✓ Database tables successfully updated!${NC}"

# 6. Restart/Start all Docker containers
echo -e "\n${YELLOW}[4/4] Restarting/Starting all services...${NC}"
docker compose up -d

echo -e "\n${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 Production Deployment & Migrations Complete! 🎉${NC}"
echo -e "${GREEN}===============================================${NC}"
