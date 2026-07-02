# NASA LaRC Open Mic Digital Sign-Up Sheet

Digital sign-up sheet for LaRC Open Mic.

A **Bun monorepo** with two workspaces:

| Workspace  | Stack                                                                           |
| ---------- | ------------------------------------------------------------------------------- |
| `apps/web` | Vite + React PWA, Tailwind v4, **oxlint**, Vitest                               |
| `apps/api` | ElysiaJS + Drizzle ORM (Postgres), OpenAPI docs, CORS, Vitest integration tests |

The web client shows a centered **`API: Reachable, DB: Connected`** status by calling the API healthcheck (`GET /api`), which runs a `SELECT 1 + 1` round-trip against Postgres.

## Architecture

- **Dev:** the API runs standalone on `:3100` (healthcheck at `/`); Vite serves the SPA on `:5183` and proxies `/api/*` to the API.
- **Prod (single Fly app):** one Docker image — Elysia serves the built SPA at `/` and mounts the API under `/api` (so the healthcheck answers at `/api`, docs at `/api/docs`). The client uses the `/api` URL in both environments.

```
.
├── apps/
│   ├── api/                 # ElysiaJS + Drizzle
│   │   ├── src/
│   │   │   ├── app.ts        # createApi(prefix) factory (cors, openapi)
│   │   │   ├── index.ts      # standalone entry (dev/tests) — health at /
│   │   │   ├── server.ts     # prod entry — serves SPA + mounts API at /api
│   │   │   ├── health.ts     # GET / -> SELECT 1 + 1
│   │   │   └── db/           # drizzle client + schema
│   │   └── drizzle.config.ts # migrations config
│   └── web/                 # Vite + React PWA
│       ├── public/          # manifest.webmanifest, sw.js, icons
│       └── src/             # App.tsx (status UI), api.ts, tests
├── compose.yml              # Postgres 17 for local dev
├── Dockerfile               # single-image build for Fly.io
├── fly.toml
└── vitest.config.ts         # coalesced api+web coverage -> .coverage/
```

## Prerequisites

[Bun](https://bun.sh) 1.3+, Docker (local Postgres), and the [Fly CLI](https://fly.io/docs/flyctl/) to deploy.

## Quick start

```bash
bun install
cp .env.example .env          # local DB url + PORT
bun run db:up                 # start Postgres (docker compose)
bun run dev                   # API on :3100, web on :5183
```

Open http://localhost:5183 — you should see **API: Reachable, DB: Connected**.

## Scripts

| Command                                          | What it does                                  |
| ------------------------------------------------ | --------------------------------------------- |
| `bun run dev`                                    | Run API + web together                        |
| `bun run build`                                  | Build the web client (`apps/web/dist`)        |
| `bun run start`                                  | Run the prod single-app server (SPA + `/api`) |
| `bun run lint`                                   | oxlint across both apps                       |
| `bun run typecheck`                              | `tsc` for api and web                         |
| `bun run test`                                   | Run all tests (api + web)                     |
| `bun run test:coverage`                          | Tests + coalesced HTML report in `.coverage/` |
| `bun run db:up` / `db:down`                      | Start / stop Postgres                         |
| `bun run db:generate` / `db:migrate` / `db:push` | Drizzle migrations / schema ops               |
| `bun run check`                                  | lint + typecheck + test                       |

## Testing & coverage

Web tests run in jsdom; API tests drive Elysia in-process via `app.handle(new Request(...))`. The **integration test** (a real `SELECT 1 + 1` Postgres round-trip via the healthcheck) is gated on `DATABASE_URL` — it runs automatically when Postgres is up (`bun run db:up`) and skips otherwise.

```bash
bun run test:coverage   # open .coverage/index.html for the combined report
```

## API

- `GET /api` — healthcheck JSON: `{ "status": "ok", "db": { "connected": true, "result": 2 } }`
- `GET /api/docs` — OpenAPI (Scalar) UI; spec at `/api/docs/json`

(Standalone, the API serves these at `/` and `/docs`.)

## Deploy to Fly.io

Single app, single image:

```bash
fly launch --no-deploy                       # creates the app (keep the generated fly.toml)
fly postgres create                          # or: fly mpg create  (Managed Postgres)
fly secrets set DATABASE_URL="postgres://..."  # attach/point at your DB
fly deploy
```

The health check hits `GET /api`. The container builds the SPA and runs `apps/api/src/server.ts`.

## Notes

This project was scaffolded with the **`create-pwa`** skill (`~/.claude/skills/create-pwa`), which documents the full recipe and the gotchas (bun Docker node_modules hoisting, drizzle-kit env loading, SPA-vs-healthcheck routing, SVG icon rasterization, coverage coalescing).
