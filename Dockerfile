FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

FROM install AS build
COPY . .
RUN bun run --cwd apps/web build

FROM base AS release
ENV NODE_ENV=production
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY apps/api ./apps/api
COPY package.json ./
EXPOSE 3000
CMD ["bun", "run", "apps/api/src/server.ts"]
