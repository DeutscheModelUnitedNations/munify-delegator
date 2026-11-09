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
CMD ["sh", "-c", "node node_modules/drizzle-kit/bin.cjs migrate && exec node build/index.js"]
