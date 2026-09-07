# PugInspect

PugInspect is a World of Warcraft character inspection app that combines character profile data, Mythic+ information, raid progression, and Warcraft Logs rankings in one interface.

Production site: [puginspect.com](https://puginspect.com/)

## Features

- Character lookup by region, realm, and name.
- Blizzard profile integration for canonical character data, avatar media, class/spec/race details, item level, guild, faction, and achievement points.
- Raider.IO integration for Mythic+ scores, best and recent dungeon runs, and raid progression.
- Warcraft Logs integration for raid rankings, parses, metrics, zone partitions, and difficulty-specific performance data.
- Potential alt detection based on Blizzard achievement timestamps.
- PostgreSQL-backed caching for external API responses using Drizzle migrations.
- Docker Compose setup for running Postgres, the backend, and the frontend together.
- Crawler and answer-engine support: per-character meta tags injected server-side for
  bots that don't run JavaScript, a database-backed `sitemap.xml`, and an `llms.txt`
  site summary generated from the season config.

## Project Structure

This repository is a pnpm and Turborepo monorepo.

```text
puginspect/
├── apps/
│   ├── frontend/          # Vite, React, TanStack Router, Mantine
│   └── backend/           # Apollo GraphQL Server, Express, Drizzle, Postgres
├── packages/
│   ├── graphql-types/     # Shared generated GraphQL types
│   └── typescript-config/ # Shared TypeScript configuration
├── nginx/                 # Nginx config for containerized frontend/proxy
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
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

**Tooling and deployment**

- pnpm workspaces
- Turborepo
- Docker and Docker Compose
- Nginx for the containerized frontend and `/graphql` proxy

## Requirements

- Node.js 24 for the backend runtime. The root package allows Node 18+, but the backend package and Docker image currently target Node 24.
- pnpm 10.18.3
- PostgreSQL 17 for local development, or Docker Compose.
- API credentials for Blizzard, Raider.IO, and Warcraft Logs.

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

Credential documentation:

- [Blizzard Battle.net Developer Portal](https://develop.battle.net/)
- [Warcraft Logs API documentation](https://www.warcraftlogs.com/api/docs)
- [Raider.IO API documentation](https://raider.io/api)

Optional frontend build variables:

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_UMAMI_WEBSITE_ID=your_umami_website_id
```

`VITE_UMAMI_WEBSITE_ID` is baked into the frontend bundle at build time. For production deploys it must be present in the `.env` file next to `docker-compose.yml` (or exported in the shell) — `deploy.sh` refuses to deploy without it, since an empty value silently disables analytics.

When running through Docker Compose, `DATABASE_URL` is provided to the backend container automatically and points at the Compose Postgres service. The backend still reads API credentials from `apps/backend/.env`.

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
```

## Docker Compose

The repository includes a Compose stack for local containerized runs:

```bash
docker compose up --build
```

This starts:

- `postgres` on `127.0.0.1:5432`
- `backend` on `127.0.0.1:4000`
- `frontend` on `127.0.0.1:8080`

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
| `pnpm lint`                         | Run lint tasks through Turbo                   |
| `pnpm check-types`                  | Run TypeScript checks                          |
| `pnpm codegen`                      | Run GraphQL code generation                    |
| `pnpm --filter backend db:migrate`  | Run backend database migrations                |
| `pnpm --filter backend db:generate` | Generate a new Drizzle migration               |
| `pnpm --filter backend db:studio`   | Open Drizzle Studio                            |
| `pnpm --filter frontend test`       | Run frontend tests                             |

## Data Flow

The GraphQL API fetches only the upstream data needed for the requested fields. Blizzard profile data is used for base character information, Raider.IO provides Mythic+ and progression data, and Warcraft Logs provides rankings and parse information.

External API responses are cached in Postgres snapshots with service-specific expiration. Blizzard achievement data is also stored for alt-link detection, where matching achievement completion timestamps can link characters that likely belong to the same account.

## Notes for Contributors

- Keep generated GraphQL types up to date after schema or query changes with `pnpm codegen`.
- Add Drizzle migrations for database schema changes instead of editing existing migrations.
- Keep API credentials out of version control.
- Prefer Docker Compose when testing the full production-like flow locally.
