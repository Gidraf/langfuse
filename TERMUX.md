# 📱 Running Langfuse natively & inside Docker on Android (Termux)

This guide shows you how to run Langfuse and local AI models (like Qwen2.5:3b) on Android devices using **Termux**. This allows you to host your own LLM engineering platform directly on a high-end smartphone, avoiding expensive cloud infrastructure and API key hosting fees.

---

## ⚡ Option A: Native installation (Bare Metal)

This is the recommended path for non-rooted phones. It installs PostgreSQL, Redis, MinIO, and Node.js natively in Termux for maximum performance.

### 1. Bootstrap all native dependencies
We have created an automated bootstrap script. Run the following command inside Termux:
```bash
./scripts/termux-setup.sh
```
This script will:
* Install Node.js LTS, PostgreSQL, Redis, and MinIO packages.
* Initialize your local Postgres database cluster (`pgdata`).
* Spin up Postgres, Redis, and MinIO in the background.
* Setup your local `.env` configuration file with correct S3 and DB links.

### 2. Configure ClickHouse
Because ClickHouse is not natively compiled for Termux, we run it inside a lightweight virtualized Ubuntu space using `proot-distro`:
1. Install proot-distro and spin up Ubuntu:
   ```bash
   pkg install proot-distro
   proot-distro install ubuntu
   proot-distro login ubuntu
   ```
2. Inside the Ubuntu console, install ClickHouse:
   ```bash
   apt update && apt install -y curl gnupg
   curl -fsSL https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | tee /etc/apt/sources.list.d/clickhouse.list
   apt update
   apt install -y clickhouse-server clickhouse-client
   ```
3. Start ClickHouse server:
   ```bash
   service clickhouse-server start
   ```

### 3. Run the application
Back in your main Termux session:
```bash
pnpm run dev
```
Open your phone's browser and navigate to `http://localhost:3000`.

---

## 🐳 Option B: Containerized Installation (Docker)

If your Android device is **rooted** and you have `dockerd` enabled, you can run the entire stack (including ClickHouse and Ollama) with a single command.

We have created an optimized `docker-compose.termux.yml` file that applies memory and CPU resource limits suitable for mobile hardware.

### Start the containers
```bash
docker compose -f docker-compose.termux.yml up -d
```

This runs:
* **Postgres** (DB) — Limited to 512MB RAM
* **Redis** (Queue) — Limited to 128MB RAM
* **MinIO** (S3 storage) — Limited to 256MB RAM
* **ClickHouse** (Traces log warehouse) — Limited to 1GB RAM
* **Ollama** (Local AI models) — Limited to 2GB RAM
* **Langfuse Web & Worker** — Limited to 1GB and 512MB RAM

---

## 🧠 Running Local Models on Android

To run lightweight models like `qwen2.5:3b` or `qwen2.5:0.5b` on your phone:

1. **Option A (Termux Daemon)**:
   Install Ollama natively in Termux:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama serve &
   ollama run qwen2.5:3b
   ```
2. **Option B (Android App)**:
   Install the official **Ollama Android App**, download `qwen2.5:3b`, and expose the port to localhost. Langfuse will automatically connect via `http://localhost:11434`.
