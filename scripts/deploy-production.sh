#!/usr/bin/env bash

# Production Deployment & Migration Script
# Run this script on your Ubuntu VPS to migrate your database, build images, and restart services.

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
# We default to the connection string used by your web container
DB_URL="postgresql://postgres:Winners1127@127.0.0.1:5432/langfuse"

if [ -f .env ]; then
  echo -e "${YELLOW}Loading database configuration from .env file...${NC}"
  # Extract DATABASE_URL from .env if present
  DB_URL_ENV=$(grep -E "^DATABASE_URL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$DB_URL_ENV" ]; then
    DB_URL="$DB_URL_ENV"
  fi
fi

echo -e "${YELLOW}[1/3] Running Database Migrations via Prisma...${NC}"
echo -e "Target Database: ${BLUE}${DB_URL%%:*}:****@${DB_URL#*@}${NC}"

# Run prisma db push using a temporary docker container to avoid local Node/npm version conflicts on the VPS
docker run --rm \
  -v "$(pwd)":/app \
  -w /app \
  --network host \
  node:22-alpine \
  sh -c "npm install -g pnpm && pnpm install --filter=@langfuse/shared && DATABASE_URL=\"$DB_URL\" DIRECT_URL=\"$DB_URL\" npx prisma db push --schema=packages/shared/prisma/schema.prisma --accept-data-loss"

echo -e "${GREEN}✓ Database tables successfully updated!${NC}"

# 2. Rebuild customized images
echo -e "\n${YELLOW}[2/3] Building local codebase Docker images...${NC}"
if [ -f "./scripts/build-images-sequential.sh" ]; then
  ./scripts/build-images-sequential.sh
else
  echo -e "Sequential build script not found. Running standard docker-compose build..."
  docker compose build
fi

# 3. Restart Docker containers
echo -e "\n${YELLOW}[3/3] Restarting services under Docker Compose...${NC}"
docker compose up -d

echo -e "\n${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 Production Deployment & Migrations Complete! 🎉${NC}"
echo -e "${GREEN}===============================================${NC}"
