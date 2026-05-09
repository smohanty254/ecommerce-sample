# EcoStore — Ecommerce Platform

A full-featured ecommerce platform with a React frontend, Express 5 API, PostgreSQL database, Socket.io real-time updates, and a drag-and-drop form designer.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/store run dev` — run the storefront (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed database with Faker data
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite 7, Tailwind CSS, shadcn/ui, Recharts, @dnd-kit, Socket.io-client, Zustand, TanStack Query, wouter (routing)
- API: Express 5, Socket.io
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT (jsonwebtoken), bcryptjs; role-based (admin / manager / customer)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts (50+ endpoints)
- `lib/db/src/schema/` — Drizzle schema files (users, categories, products, carts, orders, reviews, forms, notifications)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/` — jwt.ts, redis.ts, socket.ts, logger.ts
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth + RBAC middleware
- `artifacts/api-server/src/seed.ts` — Faker seed (500 users, 2000 products, 5000 orders, 10000 reviews)
- `artifacts/store/src/pages/` — Frontend pages (admin/, store/, auth/)

## Architecture decisions

- Contract-first API design: OpenAPI → Orval codegen generates all React Query hooks and Zod request/response validators
- JWT stored in localStorage; `setAuthTokenGetter` wires it into every generated API call automatically
- Socket.io runs on `/ws` path; clients join `user:<id>` and `admin` rooms for targeted real-time events
- Redis (ioredis) used for caching; gracefully degrades to no-cache if Redis is unavailable (no REDIS_URL required)
- Revenue-by-category analytics uses multi-table JOIN (order_items → products → categories) rather than subqueries

## Product

- **Customer storefront**: Homepage with featured/trending products, product catalog with filtering/sorting, product detail, cart, checkout, order history
- **Admin dashboard**: KPI cards (revenue, orders, customers, growth), sales charts, top products table, recent orders
- **Admin catalog**: Full CRUD for products, categories, stock management
- **Admin orders**: Order list, status updates with real-time Socket.io push
- **Admin users**: User list, role management
- **Form designer**: Drag-and-drop form builder with rules engine (show/hide/require on condition) and formula fields
- **Notifications**: Per-user notification stream with mark-read, real-time delivery via Socket.io

## Demo accounts (password: `password123`)

| Email | Role |
|---|---|
| admin@ecostore.com | admin |
| manager@ecostore.com | manager |
| customer@ecostore.com | customer |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` before typechecking leaf packages after changing any `lib/` schema
- The seed script uses `scripts/node_modules/.bin/tsx` — run via `pnpm --filter @workspace/api-server run seed` or `scripts/node_modules/.bin/tsx artifacts/api-server/src/seed.ts`
- Socket.io is mounted at `/ws`; the api-server artifact.toml should include `/ws` in its paths

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
