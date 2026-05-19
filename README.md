# Carnage API

Multi-branch e-commerce REST API for the Carnage activewear & lifestyle brand. Built with NestJS + MongoDB.

## Getting started

```bash
# 1. Copy env and fill the required secrets (JWT_*, MONGODB_URI, SUPER_ADMIN_PASSWORD)
cp .env.example .env

# 2. Install deps
npm install

# 3. Run in dev mode (hot reload)
npm run start:dev

# 4. Open Swagger
open http://localhost:4000/api/docs
```

## Scripts

| Script              | Purpose                       |
| ------------------- | ----------------------------- |
| `npm run start:dev` | Start with watch mode         |
| `npm run start`     | Start once                    |
| `npm run build`     | Compile to `dist/`            |
| `npm run lint`      | ESLint + autofix              |
| `npm run format`    | Prettier write                |
| `npm test`          | Unit tests (Jest)             |
| `npm run test:e2e`  | End-to-end tests              |

## Endpoints (step 1)

- `GET /api/health` — liveness probe
- `GET /api/docs` — Swagger UI

More modules come online with each build step (see `PROMPT.md`-style backend brief in repo root).

## Project layout (target)

```
src/
├── app.module.ts
├── main.ts
├── common/           # decorators / guards / filters / interceptors / pipes
├── config/           # configuration + Joi schema
├── modules/          # auth, users, branches, products, orders, ...
└── database/seeds/   # seeders
```
