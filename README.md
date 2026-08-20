## Local development

The project uses Next.js, Prisma ORM 7, and PostgreSQL running in Docker.

### First launch with Docker

1. Start Docker Desktop.
2. Copy the local configuration: `cp .env.example .env`
3. Run `npm run docker:up` (or `docker compose up --build`).
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
5. In Google Cloud Console, add `http://localhost:3000/api/auth/callback/google` to the OAuth application's authorised redirect URIs.
6. Open [http://localhost:3000](http://localhost:3000) and sign in with the owner's Google account first.

The app waits for PostgreSQL, applies the committed migrations, generates Prisma Client, and then starts Next.js. The first Google user in an empty database becomes the administrator. Stop the stack with `npm run docker:down`. Your PostgreSQL data remains in the `postgres_data` Docker volume.

### Run Next.js on your computer, PostgreSQL in Docker

1. Install dependencies: `npm install`
2. Copy the local configuration: `cp .env.example .env`
3. Start PostgreSQL: `npm run db:up`
4. Apply the initial database schema: `npm run db:deploy`
5. Generate the Prisma client: `npm run db:generate`
6. Start the application: `npm run dev`

After the owner signs in and becomes the first administrator, run `npm run db:seed` to add three realistic demo projects and their expenses to that administrator's dashboard. The seed is idempotent: it only updates records with its fixed `seed-*` IDs and never changes roles or approval states.

Open [http://localhost:3000](http://localhost:3000).

### Database commands

- `npm run db:up` — start PostgreSQL in Docker.
- `npm run db:down` — stop PostgreSQL (the data volume is retained).
- `npm run docker:up` — start both PostgreSQL and the Next.js application in Docker.
- `npm run docker:down` — stop the complete local stack.
- `npm run db:generate` — regenerate Prisma Client after schema changes.
- `npm run db:migrate -- --name descriptive_change` — create and apply a migration.
- `npm run db:deploy` — apply existing migrations without creating new ones.
- `npm run db:seed` — add or refresh the demo projects and expenses for the first approved administrator.
- `npm run db:studio` — open Prisma Studio.

## Access control

- Authentication is available only through Google OAuth; the local email/password provider has been removed.
- On an empty database, the first Google sign-in becomes the initial `ADMIN`. Every later Google user is created with the `PENDING` status and cannot access the CRM until an administrator approves it on **Доступы**.
- Administrators can set the `ADMIN`, `MANAGER`, or `MEMBER` role, approve, return to pending, or reject an account. Only an `ADMIN` can call the corresponding API endpoints.
- Roles and approval state are stored in PostgreSQL. No email address is privileged by environment configuration.

The local Docker database is intentionally development-only; use distinct credentials and a managed PostgreSQL instance in production.

## Architecture

- `src/app` contains only Next.js routes, layouts, pages, and Route Handler entry points.
- `src/components`, `src/hooks`, and `src/lib` contain client and shared UI code.
- `server/db` owns the Prisma client and database connection.
- `server/prisma` contains the Prisma schema and migrations.
- `server/auth` owns Auth.js configuration, guards, and the public server API.
- `server/modules` contains self-contained business features, including projects, expenses, and user access management.
- `server/shared` provides typed errors, Zod parsing, HTTP error handling, and cursor pagination for server modules.

The Auth.js Route Handler is intentionally thin and delegates to `@/server/auth`; Google is the only configured provider.

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
