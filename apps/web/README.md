# apps/web

Next.js frontend for B community.

## Local

```bash
npm install
npm run dev
```

Admin console: `http://localhost:3000/admin`
- Manual post publish
- One-click auto post run
- Raw markdown edit/delete

## Required env

Copy `.env.example` and set:

- `NEXT_PUBLIC_API_BASE_URL` (local: `http://localhost:3001`)
- `NEXT_PUBLIC_SERVICE_A_NAME`
- `NEXT_PUBLIC_SERVICE_A_URL`
