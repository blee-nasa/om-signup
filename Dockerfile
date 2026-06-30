# Single-image build for Fly.io: builds the Vite SPA, then runs the Elysia
# server which serves the SPA at / and the API under /api.
FROM oven/bun:1 AS base
WORKDIR /app

# --- install deps against the full workspace (cached on lockfile) ---
FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

# --- build the web client ---
FROM install AS build
COPY . .
RUN bun run --cwd apps/web build

# --- runtime image ---
FROM base AS release
ENV NODE_ENV=production
# bun keeps the package store in the root node_modules and puts symlinks in each
# workspace's node_modules — copy both so apps/api can resolve its deps.
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY apps/api ./apps/api
COPY package.json ./
EXPOSE 3000
CMD ["bun", "run", "apps/api/src/server.ts"]
