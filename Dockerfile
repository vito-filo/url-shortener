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

# Selective copy of prisma CLI and its complete transitive dependency tree.
# Generated with: npm ls prisma --all --json | node -e "<collect-all-deps>"
# Scoped packages are grouped into a single COPY per scope.
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/.bin/prisma       ./node_modules/.bin/prisma
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/prisma            ./node_modules/prisma
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/@prisma           ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/@standard-schema  ./node_modules/@standard-schema
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/c12               ./node_modules/c12
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/chokidar          ./node_modules/chokidar
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/citty             ./node_modules/citty
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/confbox           ./node_modules/confbox
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/consola           ./node_modules/consola
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/deepmerge-ts      ./node_modules/deepmerge-ts
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/defu              ./node_modules/defu
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/destr             ./node_modules/destr
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/dotenv            ./node_modules/dotenv
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/effect            ./node_modules/effect
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/empathic          ./node_modules/empathic
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/exsolve           ./node_modules/exsolve
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/fast-check        ./node_modules/fast-check
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/giget             ./node_modules/giget
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/jiti              ./node_modules/jiti
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/node-fetch-native ./node_modules/node-fetch-native
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/nypm              ./node_modules/nypm
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/ohash             ./node_modules/ohash
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/pathe             ./node_modules/pathe
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/perfect-debounce  ./node_modules/perfect-debounce
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/pkg-types         ./node_modules/pkg-types
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/pure-rand         ./node_modules/pure-rand
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/rc9               ./node_modules/rc9
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/readdirp          ./node_modules/readdirp
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/tinyexec          ./node_modules/tinyexec
COPY --from=deps --chown=nextjs:nextjs /app/node_modules/typescript        ./node_modules/typescript

COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
