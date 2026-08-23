## Local development

The project uses Next.js, Prisma ORM 7, and PostgreSQL running in Docker.

### First launch with Docker

1. Start Docker Desktop.
2. Copy the local configuration: `cp .env.example .env`
3. Set `ADMIN_EMAIL` in `.env` to the email address for the first administrator.
4. Run `npm run docker:up` (or `docker compose up --build`).
5. Open [http://localhost:3001](http://localhost:3001), register that address, and sign in.

The development container waits for PostgreSQL, applies the committed migrations, generates Prisma Client, and then starts Next.js. Stop the stack with `npm run docker:down`. Your PostgreSQL data remains in the `postgres_data` Docker volume.

The default `Dockerfile` target is a production image: it builds Next.js once and starts it with `node server.js`. Apply migrations with `npm run db:deploy` as a separate, single-run deployment step before replacing application instances. Never run migrations during image build.

### Production with Docker

`docker-compose.yml` is deliberately development-only: it mounts the source directory and starts `next dev`, which shows the Next.js `N` development indicator. Do not deploy it publicly.

For production, create an untracked `.env.production` with the production `DATABASE_URL`, `ADMIN_EMAIL`, Telegram values, and an optional `APP_PORT`. Then run:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

The one-time `migrate` container applies migrations first; only after it succeeds does the production `app` container start `node server.js` with `NODE_ENV=production`. It has no source-code volume and cannot show Next.js development UI.

### Production on Vercel

The public domain is served by Vercel. The committed `vercel.json` runs
`prisma migrate deploy` before a **production** build, so the database schema
cannot lag behind the deployed application code. Set `DATABASE_URL` for the
Production environment in Vercel Project Settings. Preview builds deliberately
skip migrations to avoid changing the production database from a branch build.

### Production data protection

Before real use, deploy PostgreSQL with automated encrypted backups and point-in-time recovery. Regularly restore one backup into an isolated environment and verify that the CRM starts and its financial totals reconcile. A Docker volume is persistent storage, not a backup.

Financial writes use an idempotency key and are serialized per project. API consumers must preserve the same `clientRequestId` UUID when retrying a create request; sending a new key intentionally creates a new operation.

### Run Next.js on your computer, PostgreSQL in Docker

1. Install dependencies: `npm install`
2. Copy the local configuration: `cp .env.example .env`
3. Start PostgreSQL: `npm run db:up`
4. Apply the initial database schema: `npm run db:deploy`
5. Generate the Prisma client: `npm run db:generate`
6. Set `ADMIN_EMAIL` to the email address for the first administrator.
7. Start the application: `npm run dev`

### Demo data

For a local development database, run `npm run db:seed` after applying the
migrations. The seed is idempotent: subsequent runs do not create duplicate
records. It creates an approved administrator, one project, a payment, three
expenses, and three tasks.

By default, the administrator is `admin@shinex.local` with password
`ChangeMe123!`. Override these development-only values through
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`. Do not run the demo
seed against a production database.

Register the configured administrator email through the normal registration form to create the first administrator. Demo data is never inserted automatically; add it only with `npm run db:seed` in a local environment.

Open [http://localhost:3000](http://localhost:3000).

### Database commands

- `npm run db:up` — start PostgreSQL in Docker.
- `npm run db:down` — stop PostgreSQL (the data volume is retained).
- `npm run docker:up` — start both PostgreSQL and the Next.js application in Docker.
- `npm run docker:down` — stop the complete local stack.
- `npm run db:generate` — regenerate Prisma Client after schema changes.
- `npm run db:migrate -- --name descriptive_change` — create and apply a migration.
- `npm run db:deploy` — apply existing migrations without creating new ones.
- `npm run db:studio` — open Prisma Studio.
- `npm run db:seed` — insert the default development data.

## Access control

- Authentication uses email and password; no default users or passwords are included.
- A successful login creates one opaque, `HttpOnly` session token. It is valid for exactly 37 days and is not refreshed or exchanged for another token.
- Every registration, except the configured administrator email, starts with `PENDING` status. A user cannot sign in or use the CRM until an administrator approves the account on **Доступы**. Register the configured email to create the initial administrator.
- Set `ADMIN_EMAIL` in the deployment environment to make one designated email address an administrator during registration. That account is created with the `ADMIN` role and `APPROVED` status; leave the variable empty to disable this exception.
- Administrators can set the `ADMIN`, `MANAGER`, or `MEMBER` role, approve, return to pending, or reject an account. `ADMIN` and `MANAGER` can create and edit their own projects; `MEMBER` has read-only access to their own projects. Only an `ADMIN` can call the access-management API endpoints.
- Roles and approval state are stored in PostgreSQL.

The local Docker database is intentionally development-only; use distinct credentials and a managed PostgreSQL instance in production.

## Telegram Mini App

The CRM can be launched as a Telegram Mini App. The **Открыть CRM** menu button is the bot's default button, so every private chat uses the same production HTTPS origin.

Telegram env vars must exist only on the **Production** environment in Vercel (or the production Docker host). Do not copy `TELEGRAM_BOT_TOKEN` onto Preview: a preview deployment would overwrite the live menu button and webhook.

On Vercel the first production page view registers the menu button and `https://crm.example.com/api/telegram/webhook` in the background. Preview and `next dev` never do this automatically. Docker `next start` still registers on process boot.

1. Create a bot through [@BotFather](https://t.me/BotFather).
2. In the **production** environment, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEB_APP_URL` (the public **HTTPS** CRM origin, for example `https://crm.example.com`) and a random `TELEGRAM_WEBHOOK_SECRET` of at least 32 characters. Do not put any of them in a `NEXT_PUBLIC_` variable.
3. Apply the included database migration with `npm run db:deploy` and deploy. Open the production URL once (or open the Mini App) so the app can register the webhook after the deployment is reachable.
4. After changing the public domain, sign in as an administrator and open **Доступы**. Choose **Синхронизировать Telegram** once. That also removes obsolete per-chat URLs for linked CRM users. A user with an old button who has not linked their CRM account can send the bot one message (for example, `/start`) to reset that chat. The bot does not reply.
5. If Vercel Deployment Protection is on, allow unauthenticated access to `/api/telegram/webhook`. Otherwise Telegram cannot deliver updates and stale chat buttons will not reset.

The Mini App expands to the maximum available height on login and after sign-in. After signing in through the Mini App once, future payouts created by that CRM account are sent to the same private bot chat. Telegram Web (iframe) uses a `SameSite=None` session cookie; a regular browser login keeps `SameSite=Lax`.

## Architecture

- `src/app` contains only Next.js routes, layouts, pages, and Route Handler entry points.
- `src/components`, `src/hooks`, and `src/lib` contain client and shared UI code.
- `server/db` owns the Prisma client and database connection.
- `server/prisma` contains the Prisma schema and migrations.
- `server/auth` owns password verification, the single-token session, guards, and the public server API.
- `server/modules` contains self-contained business features, including projects, expenses, and user access management.
- `server/shared` provides typed errors, Zod parsing, HTTP error handling, and cursor pagination for server modules.

`POST /api/auth/login` verifies email/password and sets the only authentication cookie. The session is checked against PostgreSQL for every protected request.

## Next.js

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
