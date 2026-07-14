#!/usr/bin/env bash

# Termux installer script for Langfuse
# This script sets up Langfuse (PostgreSQL, Redis, MinIO, Node.js, Ollama) on Android using Termux.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;35m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}🚀 Langfuse Termux Setup & Installer Script 🚀${NC}"
echo -e "${BLUE}===============================================${NC}"

# 1. Update and upgrade packages
echo -e "\n${YELLOW}[1/6] Updating Termux package manager...${NC}"
pkg update -y && pkg upgrade -y

# 2. Install native packages
echo -e "\n${YELLOW}[2/6] Installing required Termux packages (Node, PG, Redis, MinIO, etc.)...${NC}"
pkg install -y \
  nodejs-lts \
  postgresql \
  redis \
  minio \
  git \
  termux-services \
  openssl \
  build-essential \
  pkg-config \
  clang \
  make \
  python3

# Install pnpm globally
echo -e "\n${YELLOW}Installing pnpm globally...${NC}"
npm install -g pnpm

# 3. Setup PostgreSQL Database
echo -e "\n${YELLOW}[3/6] Configuring PostgreSQL cluster...${NC}"
PGDATA="$PREFIX/var/lib/postgresql"
if [ ! -d "$PGDATA" ]; then
  echo -e "Initializing Postgres database cluster..."
  initdb -D "$PGDATA"
else
  echo -e "Postgres database cluster already initialized."
fi

# Start Postgres in the background if not running
if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo -e "Starting PostgreSQL..."
  pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" start
  sleep 3
fi

# Create database and user if not exists
echo -e "Creating database 'langfuse' and user 'postgres'..."
psql -d postgres -c "CREATE DATABASE langfuse;" 2>/dev/null || true
psql -d postgres -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';" 2>/dev/null || true

# 4. Setup Redis and MinIO Background Services
echo -e "\n${YELLOW}[4/6] Starting Redis and MinIO background services...${NC}"

# Redis Startup
if ! redis-cli ping >/dev/null 2>&1; then
  echo -e "Starting Redis Server..."
  redis-server --daemonize yes
  sleep 1
fi

# MinIO Startup
MINIO_DIR="$HOME/minio-data"
mkdir -p "$MINIO_DIR"
if ! curl -s http://127.0.0.1:9000 >/dev/null; then
  echo -e "Starting MinIO Server in background..."
  export MINIO_ROOT_USER=minioadmin
  export MINIO_ROOT_PASSWORD=minioadmin
  minio server "$MINIO_DIR" --address ":9000" --console-address ":9001" > "$HOME/minio.log" 2>&1 &
  sleep 2
fi

# 5. Create Configured Environment File (.env)
echo -e "\n${YELLOW}[5/6] Creating Termux local .env file...${NC}"
cat <<EOT > .env.termux
# Environment variables pre-configured for local Termux deployment
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/langfuse?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="termux-super-secret-nextauth-key-12345"
SALT="termux-salt-12345"

# Redis Config (Default local port)
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"

# S3 Storage Config (Natively running MinIO on Termux)
LANGFUSE_S3_MEDIA_UPLOAD_BUCKET="langfuse"
LANGFUSE_S3_MEDIA_UPLOAD_PREFIX="media/"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
AWS_ENDPOINT="http://127.0.0.1:9000"
AWS_REGION="us-east-1"
AWS_S3_FORCE_PATH_STYLE="true"

# Ollama Endpoint (Android local / Termux daemon)
OLLAMA_HOST="http://localhost:11434"

# Note on ClickHouse:
# ClickHouse does not run natively inside Termux bare metal.
# Set CLICKHOUSE_URL to your remote ClickHouse instance,
# or follow the proot-distro instructions in TERMUX.md to run ClickHouse via Ubuntu proot.
CLICKHOUSE_URL="http://localhost:8123"
EOT

cp .env.termux .env

# Create bucket in MinIO using CLI or simple script
echo -e "Configuring local MinIO bucket..."
mkdir -p "$MINIO_DIR/langfuse"

# 6. Install Dependencies & Build
echo -e "\n${YELLOW}[6/6] Installing Node dependencies and generating client...${NC}"
pnpm install
pnpm run db:generate

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}🎉 Native Termux Installation Core Services Complete! 🎉${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "\n${YELLOW}Next Steps to Run Langfuse:${NC}"
echo -e "1. Install Ollama in Termux (or run Ollama Android App) and fetch Qwen:"
echo -e "   curl -fsSL https://ollama.com/install.sh | sh"
echo -e "   ollama run qwen2.5:3b"
echo -e "2. ${BLUE}ClickHouse Note:${NC} To run ClickHouse on Android, run Ubuntu inside Termux:"
echo -e "   pkg install proot-distro"
echo -e "   proot-distro install ubuntu"
echo -e "   proot-distro login ubuntu"
echo -e "   (Inside Ubuntu): apt update && apt install clickhouse-server"
echo -e "3. Start the dev server:"
echo -e "   pnpm run dev"
echo -e "======================================================"
