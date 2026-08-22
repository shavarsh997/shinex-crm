FROM node:22-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

# A short-lived production deployment job. Migrations run here, never while
# building an image and never in the long-running web server.
FROM base AS migrate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

CMD ["npm", "run", "db:deploy"]

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma generation and Next.js module analysis require a URL, but the build
# must never connect to or mutate the production database.
ENV DATABASE_URL="postgresql://shinex:shinex_build:5432/shinex_crm?schema=public"
RUN npm run db:generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 3000

USER nextjs

CMD ["node", "server.js"]
