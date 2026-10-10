# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
# Prisma's query engine needs OpenSSL
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund && npx prisma generate

# Development image used by docker compose: all dependencies, tsx watch
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

FROM deps AS build
COPY . .
RUN npm run build \
  && npm prune --omit=dev --no-audit --no-fund \
  && npx prisma generate

# Production image: compiled JavaScript, production dependencies, non-root user
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:4000/v1/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
