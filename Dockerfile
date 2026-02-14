# Stage 1: Install dependencies
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y openssl libssl-dev
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# Stage 2: Build the application
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Explicitly generate prisma client inside the container
RUN npx prisma generate
RUN SKIP_ENV_VALIDATION=true npm run build

# Stage 3: Production image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
# Copy the generated client from the builder stage
COPY --from=builder /app/generated ./generated

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
