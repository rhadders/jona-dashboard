# Jona Dashboard als container, voor Dokploy (docs/deployment.md).
#
# Drie fasen: dependencies, build (Next.js standalone), runtime. Het image
# draait één Node-proces. Bij het starten lopen de migraties
# (src/instrumentation.ts); draai de service met precies één replica.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# De npm-cache blijft tussen builds bewaard (BuildKit cache-mount), zodat een
# gewijzigd lockfile niet alles opnieuw hoeft te downloaden.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Optioneel, voor next build op een kleine server.
ARG NODE_OPTIONS
# De bouwcache van Next (.next/cache) blijft tussen builds bewaard. De cache zit
# niet in het image; het runner-stadium kopieert alleen standalone en static.
# De build heeft geen database en geen sleutels nodig: alles wat geheim is,
# leest de app pas bij het draaien uit de omgeving.
RUN --mount=type=cache,id=jona-dashboard-next-cache,target=/app/.next/cache npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# De commit waaruit het image komt; /api/health meldt hem, zodat de workflow
# na het uitrollen kan zien dat de nieuwe versie draait.
ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=$SOURCE_COMMIT
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
USER node
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null || exit 1
CMD ["node", "server.js"]
