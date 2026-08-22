## Local development

The project uses Next.js, Prisma ORM 7, and PostgreSQL running in Docker.

### First launch with Docker

1. Start Docker Desktop.
2. Copy the local configuration: `cp .env.example .env`
3. Set `ADMIN_EMAIL` in `.env` to the email address for the first administrator.
4. Run `npm run docker:up` (or `docker compose up --build`).
5. Open [http://localhost:3001](http://localhost:3001), register that address, and sign in.

The development container waits for PostgreSQL, applies the committed migrations, generates Prisma Client, and then starts Next.js. Stop the stack with `npm run docker:down`. Your PostgreSQL data remains in the `postgres_data` Docker volume.

The default `Dockerfile` target is a production image: it builds Next.js once and starts it with `node server.js`. Apply migrations with `npm run db:deploy` as a separate deployment step.

### Run Next.js on your computer, PostgreSQL in Docker

1. Install dependencies: `npm install`
2. Copy the local configuration: `cp .env.example .env`
3. Start PostgreSQL: `npm run db:up`
4. Apply the initial database schema: `npm run db:deploy`
5. Generate the Prisma client: `npm run db:generate`
6. Set `ADMIN_EMAIL` to the email address for the first administrator.
7. Start the application: `npm run dev`

Register the configured administrator email through the normal registration form to create the first administrator. No demo users, passwords, projects, or expenses are included.

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

## Access control

- Authentication uses email and password; no default users or passwords are included.
- A successful login creates one opaque, `HttpOnly` session token. It is valid for exactly 37 days and is not refreshed or exchanged for another token.
- Every registration, except the configured administrator email, starts with `PENDING` status. A user cannot sign in or use the CRM until an administrator approves the account on **Доступы**. Register the configured email to create the initial administrator.
- Set `ADMIN_EMAIL` in the deployment environment to make one designated email address an administrator during registration. That account is created with the `ADMIN` role and `APPROVED` status; leave the variable empty to disable this exception.
- Administrators can set the `ADMIN`, `MANAGER`, or `MEMBER` role, approve, return to pending, or reject an account. `ADMIN` and `MANAGER` can create and edit their own projects; `MEMBER` has read-only access to their own projects. Only an `ADMIN` can call the access-management API endpoints.
- Roles and approval state are stored in PostgreSQL.

The local Docker database is intentionally development-only; use distinct credentials and a managed PostgreSQL instance in production.

## Telegram Mini App

The CRM can be launched as a Telegram Mini App. The **Открыть CRM** menu button is kept beside the input in every private chat with the bot; no launch message with an inline button is needed. The CRM registers its protected webhook and menu button automatically when its Node.js server starts after deployment.

1. Create a bot through [@BotFather](https://t.me/BotFather).
2. In the deployment environment, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEB_APP_URL` (the public **HTTPS** CRM origin, for example `https://crm.example.com`) and a random `TELEGRAM_WEBHOOK_SECRET` of at least 32 characters. Do not put any of them in a `NEXT_PUBLIC_` variable.
3. Apply the included database migration with `npm run db:deploy` and deploy the app. On startup, it registers `https://crm.example.com/api/telegram/webhook` with Telegram.
4. Open a private chat with the bot once, then use **Открыть CRM** beside the message input. The Mini App requests fullscreen mode when the Telegram client supports it and otherwise expands to the maximum available height. After signing in through the Mini App once, future payouts created by that CRM account will be sent to the same private bot chat.

Telegram requires a public HTTPS deployment. If the hosting platform starts server instances only when the first request arrives, start the deployed CRM once after deployment so it can register the webhook.

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
