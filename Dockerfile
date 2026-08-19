FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV DATABASE_URL="postgresql://shinex:shinex_dev_password@db:5432/shinex_crm?schema=public"
RUN npm run db:generate

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
