#!/usr/bin/env bash
# Run on the VPS from the repository root (same directory as docker-compose.yml).
# Requires: Docker + Compose plugin, and a .env file with at least JWT_SECRET and NEXT_PUBLIC_API_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Error: no .env in $ROOT"
  echo "Copy .env.example to .env and set JWT_SECRET and NEXT_PUBLIC_API_URL (browser-reachable API URL, e.g. http://YOUR_IP:5000)."
  exit 1
fi

if [[ "${1:-}" == "--pull" ]]; then
  git pull
fi

echo "Building web image (NEXT_PUBLIC_* is baked in here)..."
docker compose build --no-cache web

echo "Starting / updating all services..."
docker compose up -d --build

echo "OK. Default ports: API host 5000 → container 3000, web host 5001 → container 3001"
echo "Check: docker compose ps && docker compose logs -f --tail=50 api web"
