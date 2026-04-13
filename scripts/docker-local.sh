#!/usr/bin/env bash
# Full stack via Docker Compose (Postgres + Redis + API + Web).
# Browser must call API on host port 5000 (not 3000).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon tidak bisa diakses (bukan masalah project ini)."
  echo ""
  echo "Di Fedora biasanya:"
  echo "  sudo systemctl start docker"
  echo "  sudo systemctl enable docker   # opsional, jalan otomatis saat boot"
  echo ""
  echo "Agar tidak perlu sudo setiap kali:"
  echo "  sudo usermod -aG docker \"\$USER\""
  echo "  lalu logout/login (atau: newgrp docker)"
  echo ""
  echo "Cek: docker run --rm hello-world"
  exit 1
fi

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:5000}"

echo "Using NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL (for web image build)"
echo "Building & starting…"
docker compose up -d --build

echo ""
echo "Waiting for Postgres/Redis health (max ~60s)…"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U tiktok >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if docker compose ps api 2>/dev/null | grep -q 'Up'; then
  echo "Running DB schema (db:push)…"
  docker compose exec -T api bun run db:push 2>&1 || echo "(db:push failed — run manually when api is healthy)"
else
  echo "API container not up yet; run later: docker compose exec -T api bun run db:push"
fi

echo ""
docker compose ps
echo ""
echo "→ Web:  http://localhost:5001"
echo "→ API:  http://localhost:5000"
echo "Logs:   docker compose logs -f api web"
