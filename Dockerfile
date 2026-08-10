# Multi-stage build for RRKM Dashboard
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3002

RUN mkdir -p /app/data

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Reinstall only production deps + regenerate Prisma client
RUN npm ci --only=production && npx prisma generate

# Auto-sync DB schema on start + start server
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3002
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
