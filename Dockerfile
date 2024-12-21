# FROM oven/bun:slim AS base

# FROM base AS dual
# WORKDIR /temp
# RUN apt-get -y update; apt-get -y install curl
# # we need to use node and bun for generating prisma files, see https://github.com/prisma/prisma/issues/21241
# RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash
# RUN apt-get install -y nodejs

# FROM dual AS builder
# WORKDIR /app

# ARG VERSION
# ENV PUBLIC_VERSION=$VERSION
# ARG SHA
# ENV PUBLIC_SHA=$SHA

# COPY package.json bun.lockb tsconfig.json ./
# RUN  bun install --frozen-lockfile
# # we need to generate prisma files before building to prevent type errors
# COPY ./prisma/migrations ./prisma/migrations/
# COPY ./prisma/schema.prisma ./prisma/schema.prisma
# COPY ./prisma/pothos.config.ts ./prisma/pothos.config.ts
# RUN bunx prisma generate

# COPY . .
# # the build command generates a few things, such as i18n outputs
# # therefore we need to run the build command BEFORE we check for correctness
# RUN bun run build
# RUN bun run check
# # remove all dependencies which are unused
# # TODO https://github.com/oven-sh/bun/issues/3605

# FROM base AS release
# WORKDIR /app

# ARG VERSION
# ENV PUBLIC_VERSION=$VERSION
# ARG SHA
# ENV PUBLIC_SHA=$SHA

# # the runtime dependencies
# COPY --from=builder /app/node_modules ./node_modules/

# # the sveltekit output
# COPY --from=builder /app/build .
# # the tasks build output
# COPY --from=builder /app/tasksOut .
# # the prisma schema and migrations
# COPY --from=builder /app/prisma ./prisma/


# # Make a folder called /app/ephemeralData
# RUN mkdir /app/ephemeralData
# # Change ownership to the bun user
# RUN chown -R bun:bun /app/node_modules /app/prisma /app/ephemeralData

# ENV NODE_ENV=production
# USER bun
# EXPOSE 3000/tcp
# # HEALTHCHECK --interval=15s --timeout=10s --retries=3 CMD curl -f http://0.0.0.0:3000/api/health/ready || exit 1
# CMD npx prisma migrate deploy && node ./index.js

FROM oven/bun:slim AS builder
WORKDIR /build

RUN apt-get -y update; apt-get -y install curl
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash
RUN apt-get install -y nodejs

ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA

COPY package.json bun.lockb tsconfig.json ./
RUN  bun install --frozen-lockfile

# we need to generate prisma files before building to prevent type errors
COPY ./prisma/migrations ./prisma/migrations/
COPY ./prisma/schema.prisma ./prisma/schema.prisma
COPY ./prisma/pothos.config.ts ./prisma/pothos.config.ts
RUN bunx prisma generate

COPY . .
# the build command generates a few things, such as i18n outputs
# therefore we need to run the build command BEFORE we check for correctness
RUN bun run build
RUN bun run check

FROM node:23.5-alpine AS release-image
WORKDIR /app

RUN addgroup -S sveltekitgroup && adduser -S sveltekituser -G sveltekitgroup 
RUN chown -R sveltekituser:sveltekitgroup /app
USER sveltekituser

FROM release-image AS runtime-dependencies
# we need prisma for this image/platform at runtime
RUN npm i prisma

FROM release-image AS release
ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA

# the sveltekit output
COPY --chown=sveltekituser:sveltekituser --from=builder /build/build .
# the tasks build output
COPY --chown=sveltekituser:sveltekituser --from=builder /build/tasksOut .
# the prisma schema and migrations
COPY --chown=sveltekituser:sveltekituser --from=builder /build/prisma/migrations ./prisma/migrations
COPY --chown=sveltekituser:sveltekituser --from=builder /build/prisma/schema.prisma ./prisma/schema.prisma
# runtime dependencies
COPY --chown=sveltekituser:sveltekituser --from=runtime-dependencies /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PUBLIC_NODE_ENV=production
CMD npx prisma migrate deploy && node ./index.js