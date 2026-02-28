# PugInspect

**PugInspect** is a World of Warcraft companion app that allows players to quickly look up characters and view their **Raider.IO** scores and **WarcraftLogs** data — all in one convenient interface.

[Link to site](https://puginspect.com/)

## 🚀 Features


*   🔍 **Character Search** — Find any WoW character by name and realm.
    
*   📊 **Raider.IO Integration** — View Mythic+ scores & dungeon runs.
    
*   📜 **WarcraftLogs Data** — Check raid logs, parses, and performance insights.
    
*   ⚡ **Unified Interface** — All your raiding and performance data in one clean view.
    

## 🧩 Project Structure

This project uses a **Turborepo** monorepo setup, managed with **pnpm**.
```
puginspect/
├── apps/
│   ├── frontend/          # Vite + React app using TanStack Router
│   └── backend/           # Apollo GraphQL Server
│
├── packages/
│   ├── graphql-types/     # Shared GraphQL types generated from the backend schema
│   └── typescript-config/ # Shared TypeScript configurations
│
├── package.json
├── turbo.json
└── pnpm-workspace.yaml
```
## 🛠️ Tech Stack

**Frontend**

*   ⚛️ [React](https://react.dev/) ([Vite](https://vite.dev/))
    
*   🧭 [TanStack Router](https://tanstack.com/router/latest)
    
*   🎨 TypeScript + [Mantine Component Library](https://mantine.dev/)
    

**Backend**

*   🚀 [Apollo GraphQL Server](https://www.apollographql.com/docs/apollo-server)
    
*   🌐 [Node.js](https://nodejs.org)
    
*   🔗 Integrations: [Raider.IO](https://raider.io/) API, [WarcraftLogs](https://www.warcraftlogs.com/) API
    

**Tooling & Monorepo**

*   🏗️ [Turborepo](https://turborepo.com/)
    
*   📦 [pnpm](https://pnpm.io/)
    

## 🧑‍💻 Development Setup

### 1\. Install dependencies

```
pnpm install
```
### 2\. Run the app

```
pnpm dev
```
or if you have turbo installed globally
```
turbo dev
```

### 🧰 Useful Commands

|                           Command | Description                      |
| --------------------------------: | -------------------------------- |
|                    `pnpm install` | Install all dependencies         |
|                        `pnpm dev` | Run all apps in development mode |
|                      `pnpm build` | Build all apps                   |
| `pnpm --filter apps/frontend dev` | Run only the frontend            |
|  `pnpm --filter apps/backend dev` | Run only the backend             |


### 📁 Environment Variables

Since the data is coming from RaiderIo and Warcraftlogs you need to create your own keys from each source. <br>
Links below explain how to do this: <br>
[Warcraftlogs](https://www.warcraftlogs.com/api/docs) <br>
[Raider IO](https://raider.io/api) <br>

When you have the keys, create a `.env` file in the backend.

Example, `apps/backend/.env`:

And add the keys:
```
RAIDERIO_API_KEY=raiderio_apikey
WARCRAFTLOGS_CLIENT_ID=warcraftlogs_client_id
WARCRAFTLOGS_CLIENT_SECRET=warcraftlogs_client_secret
```
