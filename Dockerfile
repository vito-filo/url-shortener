# =============================================================================
# Stage 1: Production dependencies
# Installs only production deps (--omit=dev). prisma is listed as a dependency
# (not devDependency) so the CLI is included here and available to the
# migrations init container at runtime.
# --ignore-scripts skips the postinstall `prisma generate` hook, which fails
# without PRISMA_CUSTOM_URL (see Stage 2 for why that env var is needed).
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# =============================================================================
# Stage 2: Build
# Requires a full install (devDeps) because @tailwindcss/postcss and other
# build tools are devDependencies. Cannot reuse Stage 1 node_modules.
# PRISMA_CUSTOM_URL: prisma.config.ts calls env() at config load time, which
# throws if the variable is missing — even for `generate`, which never
# connects to the database. A dummy value satisfies the loader.
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN PRISMA_CUSTOM_URL=postgresql://dummy npx prisma generate
RUN npm run build

# =============================================================================
# Stage 3: Runner
# Uses Next.js standalone output: the build traces all runtime dependencies
# and bundles them into .next/standalone, so no separate node_modules copy
# is needed for the server itself.
# node_modules from Stage 1 (prod only) is included solely for `prisma migrate
# deploy`, which runs as a Kubernetes init container before the app starts.
# If this still results in a large image, consider copying only the prisma CLI
# and its transitive deps (prisma, @prisma/*, effect) from Stage 2 instead.
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=deps    --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
