# PugInspect

PugInspect is a World of Warcraft character inspection app that combines character profile data, Mythic+ information, raid progression, and Warcraft Logs rankings in one interface.

Production site: [puginspect.com](https://puginspect.com/)

## Features

- Character lookup by region, realm, and name.
- Blizzard profile integration for canonical character data, avatar media, class/spec/race details, equipped gear, item level, guild, faction, and achievement points.
- Raider.IO integration for Mythic+ scores, best and recent dungeon runs, and raid progression.
- Warcraft Logs integration for raid rankings, parses, metrics, zone partitions, and difficulty-specific performance data.
- Potential alt detection based on Blizzard achievement timestamps.
- Roster Check (`/roster`): paste an export string from the PugInspect in-game addon to inspect a whole raid roster at once. The format is documented in [`docs/ROSTER_EXPORT_FORMAT.md`](docs/ROSTER_EXPORT_FORMAT.md).
- Mythic+ Spec Meta (`/mythic-plus`): spec popularity across top Warcraft Logs Mythic+ rankings, refreshed hourly by a backend crawl.
- Site stats (`/stats`): search volume, region breakdown, and class distribution.
- PugInspect Companion: a Windows desktop app that shows Group Finder applicants the moment they apply, enriched with the same data. See [`apps/companion/README.md`](apps/companion/README.md).
- PostgreSQL-backed caching for external API responses using Drizzle migrations.
- Crawler and answer-engine support: per-character meta tags injected server-side for
  bots that don't run JavaScript, a database-backed `sitemap.xml`, and an `llms.txt`
  site summary generated from the season config.

## Project Structure

This repository is a pnpm and Turborepo monorepo.

```text
puginspect/
├── apps/
│   ├── frontend/          # Vite, React, TanStack Router, Mantine
│   ├── backend/           # Apollo GraphQL Server, Express, Drizzle, Postgres
│   └── companion/         # Tauri 2 desktop app (Windows)
├── packages/
│   ├── graphql-types/     # Shared generated GraphQL types
│   ├── ui/                # Theme and UI primitives shared by frontend and companion
│   └── typescript-config/ # Shared TypeScript configuration
├── e2e/                   # Playwright smoke tests
├── scripts/               # Season config generator, telemetry queries
├── docs/                  # Format specs and runbooks
├── nginx/                 # Nginx config baked into the frontend image
├── docker-compose.yml
├── docker-compose.override.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── deploy.sh              # Production deploy: pull images and restart
├── package.json
├── turbo.json
└── pnpm-workspace.yaml
```

## Tech Stack

**Frontend**

- React 19 with Vite
- TanStack Router and TanStack Query
- Mantine UI
- GraphQL Code Generator

**Backend**

- Node.js 24
- Apollo Server with Express
- PostgreSQL with Drizzle ORM and migrations
- External APIs: Blizzard Battle.net API, Raider.IO API, and Warcraft Logs API
- OpenTelemetry traces and logs (optional, off unless an OTLP endpoint is configured)

**Companion**

- Tauri 2 (Rust) with React

**Tooling and deployment**

- pnpm workspaces
- Turborepo
- Vitest and Playwright
- Docker and Docker Compose
- Nginx for the containerized frontend and `/graphql` proxy
- GitHub Actions and GitHub Container Registry

## Requirements

- Node.js 24 (the root package requires 23+, the backend and its Docker image target 24).
- pnpm 11.25.0 — the version is pinned in `package.json` `packageManager`, so `corepack enable` picks it up.
- PostgreSQL 17 for local development, or Docker Compose.
- API credentials for Blizzard, Raider.IO, and Warcraft Logs.
- Rust, only for building the companion natively.

## Environment Variables

Create `apps/backend/.env` for backend credentials and local development settings.

```env
RAIDERIO_API_KEY=your_raiderio_api_key
WARCRAFTLOGS_CLIENT_ID=your_warcraftlogs_client_id
WARCRAFTLOGS_CLIENT_SECRET=your_warcraftlogs_client_secret
BLIZZARD_CLIENT_ID=your_blizzard_client_id
BLIZZARD_CLIENT_SECRET=your_blizzard_client_secret
DATABASE_URL=postgresql://puginspect:localdev@localhost:5432/puginspect
ALLOWED_ORIGINS=http://localhost:3000
PORT=4000
```

Optional backend variables:

| Variable                                                                         | Purpose                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `PUBLIC_ORIGIN`                                                                  | Public origin for canonical and `og:url` links in injected meta tags (default `https://puginspect.com`) |
| `FRONTEND_ORIGIN`                                                                | Where the backend fetches the built `index.html` for bot meta injection (default `http://frontend`)     |
| `LOG_LEVEL`                                                                      | Log verbosity, e.g. `debug` (default `info`)                                                            |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME` | Enable OpenTelemetry export; telemetry is off when the endpoint is unset                                |
| `COMPANION_MIN_VERSION`                                                          | Reject companion builds older than this version                                                         |
| `COMPANION_TELEMETRY_TOKEN`                                                      | Password for the internal `/companion-telemetry` view; the route is not registered when unset           |

Optional frontend build variables:

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_API_URL=
```

When running through Docker Compose, `DATABASE_URL` is provided to the backend container automatically and points at the Compose Postgres service. The backend still reads API credentials from `apps/backend/.env`. Compose reads `POSTGRES_PASSWORD` from a `.env` file next to `docker-compose.yml` (default `localdev`).

Credential documentation:

- [Blizzard Battle.net Developer Portal](https://develop.battle.net/)
- [Warcraft Logs API documentation](https://www.warcraftlogs.com/api/docs)
- [Raider.IO API documentation](https://raider.io/api)

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the full monorepo in development mode:

```bash
pnpm dev
```

By default:

- Frontend runs on `http://localhost:3000`.
- Backend runs on `http://localhost:4000/graphql`.
- The backend runs pending Drizzle migrations before starting.

To run apps separately:

```bash
pnpm --filter frontend dev
pnpm --filter backend dev
pnpm --filter companion dev
```

## Docker Compose

The repository includes a Compose stack for local containerized runs:

```bash
docker compose up --build
```

`--build` matters: without it Compose pulls the published production images instead of building your working tree.

This starts:

- `postgres` on port `5432`
- `backend` on port `4000`
- `frontend` on port `8080`

`docker-compose.override.yml` publishes these ports on all interfaces, not just localhost.

The frontend container serves the built Vite app through Nginx and proxies `/graphql`, `/stats.js`, and `/api/send` to the backend container. The latter two are first-party proxies for the Umami analytics script and its event endpoint, so ad blockers that block the `stats.*` subdomain don't drop visitor data. The backend applies Drizzle migrations during startup.

To stop the stack:

```bash
docker compose down
```

To remove the local Postgres volume as well:

```bash
docker compose down --volumes
```

## Useful Commands

| Command                             | Description                                    |
| ----------------------------------- | ---------------------------------------------- |
| `pnpm install`                      | Install workspace dependencies                 |
| `pnpm dev`                          | Run all apps in development mode through Turbo |
| `pnpm build`                        | Build all packages and apps                    |
| `pnpm check-types`                  | Run TypeScript checks                          |
| `pnpm test`                         | Run unit and integration tests                 |
| `pnpm test:e2e`                     | Run Playwright smoke tests                     |
| `pnpm format`                       | Format TypeScript and Markdown with Prettier   |
| `pnpm codegen`                      | Run GraphQL code generation                    |
| `pnpm season:update`                | Regenerate season config from live APIs        |
| `pnpm --filter backend db:migrate`  | Run backend database migrations                |
| `pnpm --filter backend db:generate` | Generate a new Drizzle migration               |
| `pnpm --filter backend db:studio`   | Open Drizzle Studio                            |

## Data Flow

The GraphQL API fetches only the upstream data needed for the requested fields. Blizzard profile data is used for base character information, Raider.IO provides Mythic+ and progression data, and Warcraft Logs provides rankings and parse information.

External API responses are cached in Postgres snapshots with service-specific expiration. Blizzard achievement data is also stored for alt-link detection, where matching achievement completion timestamps can link characters that likely belong to the same account.

## Notes for Contributors

- Keep generated GraphQL types up to date after schema or query changes with `pnpm codegen`. CI fails when they are stale.
- Generate Drizzle migrations with `pnpm --filter backend db:generate` instead of writing or editing migration files by hand.
- Seasonal game data (max level, raid tiers, M+ seasons, enchantable slots) is tagged with `SEASON-CONFIG:` comments; a scheduled workflow opens a PR when `pnpm season:update` finds new API data.
- Keep API credentials out of version control.
- Prefer Docker Compose when testing the full production-like flow locally.
