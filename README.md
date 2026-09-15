# PugInspect

World of Warcraft character inspector combining Blizzard, Raider.IO and Warcraft Logs data. Live at [puginspect.com](https://puginspect.com/).

## Requirements

- Node.js 24
- pnpm 11 (`corepack enable` picks up the pinned version)
- Docker, or a local PostgreSQL 17
- API credentials for [Blizzard](https://develop.battle.net/), [Raider.IO](https://raider.io/api) and [Warcraft Logs](https://www.warcraftlogs.com/api/docs)

## Setup

Create `apps/backend/.env`:

```env
RAIDERIO_API_KEY=
WARCRAFTLOGS_CLIENT_ID=
WARCRAFTLOGS_CLIENT_SECRET=
BLIZZARD_CLIENT_ID=
BLIZZARD_CLIENT_SECRET=
DATABASE_URL=postgresql://puginspect:localdev@localhost:5432/puginspect
ALLOWED_ORIGINS=http://localhost:3000
```

## Run

```bash
pnpm install
docker compose up -d postgres
pnpm dev
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:4000/graphql`. The backend applies database migrations on startup.

To run the whole stack in containers instead, use `docker compose up --build` (frontend on `http://localhost:8080`). Without `--build`, Compose pulls the published production images instead of building your working tree.

## Commands

| Command                             | Description                             |
| ----------------------------------- | --------------------------------------- |
| `pnpm check-types`                  | TypeScript checks                       |
| `pnpm test`                         | Unit and integration tests              |
| `pnpm test:e2e`                     | Playwright smoke tests                  |
| `pnpm codegen`                      | Regenerate GraphQL types                |
| `pnpm --filter backend db:generate` | Generate a Drizzle migration            |
| `pnpm season:update`                | Regenerate season config from live APIs |

The desktop companion has its own [README](apps/companion/README.md).
