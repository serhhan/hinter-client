# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat docker-cli
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --no-frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# Install Docker CLI in runtime image
RUN apk add --no-cache docker-cli

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Note: For Docker socket access, run container with:
# docker run --user $(id -u):$(getent group docker | cut -d: -f3) ...
# or for testing: docker run --user root ...

# Create necessary directories with correct permissions
RUN mkdir -p /app/hinter-core-data && \
    chown -R sveltekit:nodejs /app/hinter-core-data

# Copy the built application
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./package.json
COPY --from=builder --chown=sveltekit:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies
RUN corepack enable pnpm && pnpm install --prod --no-frozen-lockfile

# Create hinter-core-data directory (will be mounted as volume at runtime)
RUN mkdir -p ./hinter-core-data

USER sveltekit

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "build/index.js"] 