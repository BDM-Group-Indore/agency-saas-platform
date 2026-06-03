FROM node:20-alpine AS deps
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . .
RUN pnpm --filter @saas/database run prisma:generate
RUN pnpm --filter @saas/database run build
RUN pnpm --filter @saas/shared-types run build
RUN pnpm --filter @saas/api run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages ./packages

USER nestjs

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
