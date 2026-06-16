FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
RUN bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun build apps/api/src/index.ts --outdir apps/api/dist --target bun

# Production image
FROM oven/bun:1-slim AS release
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/packages/db/drizzle ./drizzle
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "dist/index.js"]
