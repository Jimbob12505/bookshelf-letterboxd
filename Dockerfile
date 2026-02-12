# Stage 1: Install dependencies
FROM node:20-slim AS deps
# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Copy prisma schema
COPY prisma ./prisma

# Install dependencies. This will also run `prisma generate` because of the `postinstall` script.
RUN npm install

# Stage 2: Build the application
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Copy the generated prisma client from the deps stage
COPY --from=deps /app/generated ./generated
COPY . .

RUN SKIP_ENV_VALIDATION=true npm run build

# Stage 3: Production image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

# The Prisma schema is required by the standalone output to run migrations.
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
