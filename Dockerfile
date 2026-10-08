# syntax=docker/dockerfile:1

# The sync runs during the build, not at container start: "/" and "/projects"
# are prerendered with the synced data, and only the GitHub webhook refreshes them.
#
# Build:
#   docker build -t portfolio \
#     --secret id=github_token,env=GITHUB_TOKEN \
#     --build-arg GRAFANA_DASHBOARD_URL=https://grafana.example.com/d/... \
#     .
# Run:
#   docker run -p 3000:3000 -e GITHUB_TOKEN -e GITHUB_WEBHOOK_SECRET portfolio

# Dependabot bumps this tag (it can't follow an ARG).
FROM node:24-alpine AS base
# git: the sync clones repos at build time, and webhook-triggered syncs pull them at runtime.
# tini: runs as PID 1 so signals reach node and zombie git processes get reaped.
RUN apk add --no-cache git tini
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    PORTFOLIO_HOME=/var/portfolio

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS build
# These are read when pages are prerendered or when next.config.ts builds the
# CSP headers, so they must be set at build time, not only at runtime.
ARG PORTFOLIO_MODE=live
ARG DEMO_ORIGIN=""
ARG GRAFANA_ORIGIN=""
ARG GRAFANA_DASHBOARD_URL=""
ENV PORTFOLIO_MODE=${PORTFOLIO_MODE} \
    DEMO_ORIGIN=${DEMO_ORIGIN} \
    GRAFANA_ORIGIN=${GRAFANA_ORIGIN} \
    GRAFANA_DASHBOARD_URL=${GRAFANA_DASHBOARD_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The token is optional (public repos work without it, at a lower API rate limit)
# and is mounted only for this step, so it never ends up in an image layer.
RUN --mount=type=secret,id=github_token,env=GITHUB_TOKEN \
    npm run build \
 && npm prune --omit=dev --no-audit --no-fund

FROM base AS runner
ARG PORTFOLIO_MODE=live
ENV NODE_ENV=production \
    PORTFOLIO_MODE=${PORTFOLIO_MODE} \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Code is owned by root and read-only to the app user. Only .next (the page cache,
# rewritten when the webhook revalidates) and PORTFOLIO_HOME (clones and data) are writable.
COPY --from=build /app/package.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/content ./content
COPY --from=build /app/fixtures ./fixtures
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /var/portfolio /var/portfolio

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "node_modules/next/dist/bin/next", "start"]