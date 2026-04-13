FROM oven/bun:1.3 AS base
WORKDIR /app

# Runtime with ffmpeg installed via apt
FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN bun install

# Copy source code (tsconfig.base.json required by apps/api/tsconfig.json extends)
COPY tsconfig.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3000

# Compose supplies env; skip auto .env to avoid bad files breaking startup
CMD ["bun", "run", "--no-env-file", "src/docker-entry.ts"]
