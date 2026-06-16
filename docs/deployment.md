# Deployment

This guide covers deploying the API (Hono/Bun) and web (Vite/React SPA) to production.

## Environment variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
| `AUTH_SECRET` | Random secret for Better Auth session signing (min 32 chars) |
| `APP_URL` | Public URL of the web frontend (e.g. `https://app.example.com`) |
| `API_URL` | Public URL of the API (e.g. `https://api.example.com`) |

### Email (optional — defaults to console output)

| Variable | Description |
|---|---|
| `EMAIL_PROVIDER` | Set to `resend` to enable Resend |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend` |

### File storage (optional — defaults to local disk)

| Variable | Description |
|---|---|
| `STORAGE_PROVIDER` | Set to `s3` to enable S3-compatible storage |
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | AWS region (e.g. `us-east-1`) |
| `S3_ACCESS_KEY_ID` | AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | AWS secret access key |
| `S3_ENDPOINT` | Optional — override endpoint for non-AWS providers (e.g. R2, MinIO) |

### Social auth (optional — providers enabled when both vars are set)

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |

## Running database migrations

Always run migrations before starting or updating the API:

```bash
bun run db:migrate
```

In Docker-based deployments, run this as an init step before starting the container (e.g. a Railway start command, a Fly.io release command, or a Kubernetes init container).

## API deployment (Docker)

### Build the image

From the monorepo root:

```bash
docker build -f apps/api/Dockerfile -t my-app-api:latest .
```

### Run locally

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e AUTH_SECRET="..." \
  -e APP_URL="http://localhost:5173" \
  -e API_URL="http://localhost:3000" \
  my-app-api:latest
```

### Container hosting options

The image runs on any container host:

- **Fly.io** — `fly launch` in the repo root, point it at `apps/api/Dockerfile`; add secrets with `fly secrets set`
- **Railway** — connect the repo, set the Dockerfile path to `apps/api/Dockerfile`, add environment variables in the Railway dashboard
- **Render** — create a Web Service, set Docker build context to `.` and Dockerfile path to `apps/api/Dockerfile`
- **Any Kubernetes / ECS / Cloud Run** — build, push to your registry, deploy as usual

## Web deployment (static CDN)

Build the SPA:

```bash
bun run --cwd apps/web build
```

This runs `tsc -b && vite build` and outputs files to `apps/web/dist/`. Upload that directory to any static host:

- **Vercel** — connect the monorepo, set the root directory to `apps/web`
- **Netlify** — build command `bun run build`, publish directory `dist`, run from `apps/web`
- **Cloudflare Pages** — same approach; set the framework preset to "Vite"
- **Any CDN / S3** — sync `apps/web/dist/` to your bucket

Set your CDN to serve `index.html` for all unmatched routes (SPA fallback).

## Per-environment configuration

### Development

Use a `.env` file at the monorepo root (or per-package). `docker compose up -d` starts a local Postgres instance. Run `bun run db:migrate` then `bun run db:seed` to populate demo data.

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
AUTH_SECRET=dev-secret-change-me-in-production
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
```

### Production

Set variables as secrets in your hosting platform — never commit them to source control. Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Ensure `APP_URL` and `API_URL` use `https://` in production. Configure CORS and cookie settings accordingly.
