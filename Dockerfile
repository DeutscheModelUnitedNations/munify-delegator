FROM oven/bun:1-slim AS base
WORKDIR /build
COPY package.json bun.lock ./
COPY patches ./patches

FROM base AS dependencies
RUN bun install --frozen-lockfile

FROM base AS runtime-dependencies
RUN bun install --frozen-lockfile --production

FROM dependencies AS builder
ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA
ENV NODE_OPTIONS="--max-old-space-size=8192"
COPY . .
RUN bun run build:app && bun run build:compute

FROM node:26-slim AS release
ARG OS_UPDATES_DATE
RUN apt-get update \
	&& apt-get upgrade -y --no-install-recommends \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* \
		/usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
		/usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

WORKDIR /app
COPY package.json drizzle.config.ts ./
COPY drizzle ./drizzle
# Outfit and DMUN's logos for the PDFs set with Typst (src/api/services/typst.ts)
COPY typst-assets ./typst-assets
COPY --from=runtime-dependencies /build/node_modules ./node_modules
COPY --from=builder /build/build ./build

ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA
ENV NODE_ENV=production \
	BODY_SIZE_LIMIT=64M \
	SHUTDOWN_TIMEOUT=5

USER node
EXPOSE 3000/tcp
# The swarm takes this when the service sets no healthcheck of its own: a rolling update replaces the
# next replica only once the new one answers, so one always serves. The start period covers the
# migrations; checking every 2s in it marks a new replica healthy as soon as it listens. No curl in
# the image, so node asks.
HEALTHCHECK --interval=15s --timeout=3s --start-period=120s --start-interval=2s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["sh", "-c", "node node_modules/drizzle-kit/bin.cjs migrate && exec node build/index.js"]
