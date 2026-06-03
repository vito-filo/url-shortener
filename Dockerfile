# =============================================================================
# Stage 1: Dependencies
# Full install (including devDeps) used by the builder. prisma is listed as a
# production dependency so it's available to the runner's selective copy.
# --ignore-scripts skips the postinstall `prisma generate` hook, which fails
# without PRISMA_CUSTOM_URL (see Stage 2 for why that env var is needed).
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build
# Copies node_modules from Stage 1 — no separate npm install needed.
# PRISMA_CUSTOM_URL: prisma.config.ts calls env() at config load time, which
# throws if the variable is missing — even for `generate`, which never
# connects to the database. A dummy value satisfies the loader.
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN PRISMA_CUSTOM_URL=postgresql://dummy npx prisma generate
RUN npm run build

# =============================================================================
# Stage 3: Runner
# Uses Next.js standalone output: the build traces all runtime dependencies
# and bundles them into .next/standalone, so no separate node_modules copy
# is needed for the server itself.
# Only the prisma CLI and its known transitive deps are copied from Stage 1 —
# not the full node_modules. The server needs nothing extra since the standalone
# output already bundles its own runtime dependencies.
# If `prisma migrate` fails with MODULE_NOT_FOUND, add the missing package
# to the selective COPY list below.
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

# Selective copy of prisma CLI and its transitive deps.
# effect is a transitive dep of @prisma/config required at load time.
# If prisma migrate fails with MODULE_NOT_FOUND, add the missing package here.
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/prisma      ./node_modules/prisma
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/@prisma     ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/effect      ./node_modules/effect

COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
