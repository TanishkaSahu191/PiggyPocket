# PiggyPocket  - Smart Budget Tracker

> A personal-finance web application (designed to be wrapped for Android via Capacitor) for students in India managing monthly pocket money in Indian Rupees (₹).

---

## Architecture Overview

- **Monorepo Structure**:
  - `/apps/web`: React 19 + Vite + TypeScript (mobile-first, responsive, Capacitor-ready, custom design tokens, login-first flow).
  - `/apps/api`: Node.js + TypeScript + Fastify, central JSON error handler, Zod input validation helper, rate-limiting, CORS, and structured logging with secrets redaction.
  - `/packages/shared`: Shared types and pure TypeScript **budget engine** (`packages/shared/src/budget-engine`), tested with 99.6% coverage.
  - `/docs/budget-rules.md`: Mathematical specification and worked examples for budget formulas.

---

## Non-Negotiable Core Rules

1. **Integer Paise Only**: Stored and calculated as integers. Never floats. Converted to rupees only for UI presentation.
2. **Pure Derivation**: All metrics (spent, daily overspends, cumulative overspend, adjusted projected savings) are recomputed purely from transactions and budget settings on every call. Zero stored running totals.
3. **Single Source of Truth**: All budget formulas live in `/packages/shared/src/budget-engine` used across both backend and frontend.
4. **No Hardcoded Demo Numbers**: Screen states use `EmptyState` components instead of fake numbers.
5. **Timezone Awareness**: Local dates belong to the user's IANA timezone (default: `Asia/Kolkata`). Transactions at 11:30 PM IST correctly map to the current local day.

---

## Quick Start Setup

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`
- Docker & Docker Compose (optional, or free Neon PostgreSQL)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/TanishkaSahu191/PiggyPocket.git
cd PiggyPocket
npm install
```

### 2. Environment Configuration
Copy `.env.example` into `apps/api/.env`:
```bash
cp .env.example apps/api/.env
```
Key variables:
- `PORT=3001`
- `WEB_URL=http://localhost:5173`
- `DATABASE_URL=postgresql://budget_user:budget_password@localhost:5432/smart_budget_dev`
- `JWT_SECRET=super_secret_jwt_key_for_dev_min_32_characters_long`

### 3. Database Options

#### Option A: Local PostgreSQL with Docker
Start the PostgreSQL container:
```bash
docker compose up -d
```

#### Option B: Free Cloud PostgreSQL with Neon (No Docker Required)
If you do not have Docker installed:
1. Create a free account at [neon.tech](https://neon.tech).
2. Create a new PostgreSQL project (takes ~5 seconds).
3. Copy the pooled connection string (e.g. `postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require`).
4. Paste it as `DATABASE_URL` in `apps/api/.env`.

#### Option C: In-Memory / PGlite (Zero-Config Testing)
All automated unit and integration tests run out-of-the-box using `@electric-sql/pglite` with zero external dependencies needed!

### 4. Run Database Migrations
```bash
npm run migrate
```
Applies all SQL scripts from `apps/api/migrations` and records version history in `schema_migrations`.

### 5. Start Development Servers
Run both Web and API concurrently:
```bash
npm run dev
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3001](http://localhost:3001)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

## Available Monorepo Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs both Web (`:5173`) and API (`:3001`) concurrently |
| `npm run test` | Runs all Vitest test suites (Shared, API, Web) |
| `npm run test:coverage`| Runs test suite with v8 coverage analysis (>95% on budget engine) |
| `npm run typecheck` | Runs `tsc --noEmit` across all workspaces |
| `npm run lint` | Runs ESLint 9 flat config across all workspaces |
| `npm run migrate` | Runs SQL migrations against target PostgreSQL database |

---

## Phase 1 & Phase 2 Completion Checklist

- [x] Monorepo npm workspaces (`/apps/web`, `/apps/api`, `/packages/shared`)
- [x] Fastify API with `/health`, rate-limiting, CORS, central error handler, and secrets redaction
- [x] PostgreSQL migration runner with `docker-compose.yml`, Neon documentation, and PGlite tests
- [x] Login-first routing with AuthGuard stub: visitors only access Welcome, Login, Register, Verify-OTP; all other routes redirect to Login
- [x] Mobile-first design tokens and 9 reusable UI components: Button, Input, Card, ProgressBar, Modal, Toast, Skeleton, EmptyState, ErrorState
- [x] Welcome page with interactive UI Kit demo modal and INR budget model showcase
- [x] Pure TypeScript budget engine in `/packages/shared/src/budget-engine` passing cases A, B, C, D, E, I and extras with 99.6% coverage
- [x] Detailed mathematical specification in `/docs/budget-rules.md`
