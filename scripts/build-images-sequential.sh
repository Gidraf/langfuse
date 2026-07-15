#!/usr/bin/env bash

# Builds the langfuse-web and langfuse-worker images from
# docker-compose.build.yml one at a time instead of in parallel.
#
# `docker compose build` builds independent services concurrently by default.
# Each web/worker Dockerfile build sizes its Node heap off total VM memory
# (NODE_OPTIONS=--max-old-space-size-percentage=75), so two builds running at
# once can jointly demand more memory than the Docker Desktop VM has,
# triggering an OOM kill (exit 137). Building sequentially avoids that.
#
# Any extra args are forwarded to `docker compose build`, e.g.:
#   ./scripts/build-images-sequential.sh --no-cache

set -euo pipefail

COMPOSE_FILE="docker-compose.build.yml"
SERVICES=(langfuse-web langfuse-worker)

for service in "${SERVICES[@]}"; do
  echo "==> Building ${service}"
  docker compose -f "$COMPOSE_FILE" build "$@" "$service"
done
