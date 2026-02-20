# project2 (B Community)

`project2` is the B-side content community that auto-publishes hot-issue briefs and drives qualified traffic to A service.

Current mode: local-first development. Deployment can be connected later without changing folder structure.

## Architecture

- `src/*`: Autopost pipeline (trend collection + post generation)
- `api/server.js`: Backend API for serving generated posts (Railway target)
- `apps/web/*`: Next.js frontend (Vercel target)
- `content/posts/*`: Generated markdown posts
- `data/published-state.json`: Duplicate/cooldown state
- `.github/workflows/autopost.yml`: 3 runs/day auto publishing

## Core Flows

1. GitHub Actions runs 3 times/day.
2. Pipeline fetches trend feeds and writes markdown posts.
3. Autopost commits to `main`.
4. Railway serves updated post data via API.
5. Vercel frontend reads the API and renders new content.

## Local Quick Start

1. Install root dependencies:

```bash
npm install
```

2. Install frontend dependencies:

```bash
npm --prefix apps/web install
```

3. Generate one sample post locally:

```bash
npm run run-once
```

4. Start backend API:

```bash
npm run api:dev
```

5. Start frontend in another terminal:

```bash
npm run web:dev
```

6. Open `http://localhost:3000` (web) and confirm API calls to `http://localhost:3001`.

## Local Admin Console

- URL: `http://localhost:3000/admin`
- Features:
  - trigger one auto-post run (`run-once`) from UI
  - inspect/edit raw markdown
  - delete posts

Admin API auth behavior:

- If `ADMIN_TOKEN` is set in API env, admin calls require token.
- If `ADMIN_TOKEN` is empty, admin APIs are local-IP only.

## Local Commands (Autopost)

```bash
npm install
npm run run-once   # force-generate 1 post (ignores daily cap)
npm run run-daily  # generate based on daily limits
npm run autopilot  # run in-process scheduler
npm run typecheck
npm run build
```

## Local Commands (API)

```bash
npm run api:start
npm run api:dev
```

API endpoints:

- `GET /healthz`
- `GET /api/posts?limit=20&page=1`
- `GET /api/posts/:slug`
- `GET /api/meta`

## Frontend (Vercel-ready)

Frontend app lives at `apps/web`.

```bash
cd apps/web
npm install
npm run dev
```

Required env vars (`apps/web/.env.example`):

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SERVICE_A_NAME`
- `NEXT_PUBLIC_SERVICE_A_URL`

## Autopost Schedule (3/day)

Workflow: `.github/workflows/autopost.yml`

- `00:00 UTC`
- `04:00 UTC`
- `10:00 UTC`

This equals `09:00`, `13:00`, `19:00` in `Asia/Seoul`.

## Required Repo Variables

For autopost CTA insertion:

- `SERVICE_A_NAME`
- `SERVICE_A_URL`

## Deployment Guide

Detailed setup: `docs/deployment/vercel-railway.md`
