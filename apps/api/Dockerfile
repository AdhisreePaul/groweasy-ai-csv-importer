# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @groweasy/shared build
RUN pnpm --filter @groweasy/api build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV CORS_ORIGIN=http://localhost:3000
ENV JSON_BODY_LIMIT=1mb
ENV LOG_REQUESTS=true
ENV AI_PROVIDER=openai
ENV OPENAI_MODEL=gpt-4.1-nano
ENV BATCH_SIZE=25
ENV AI_MAX_RETRIES=2
ENV MAX_FILE_SIZE_MB=5

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist

USER node
EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]
