FROM oven/bun:slim AS base
ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA

FROM base AS dual
WORKDIR /temp
RUN apt-get -y update; apt-get -y install curl
# we need to use node and bun for generating prisma files, see https://github.com/prisma/prisma/issues/21241
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash
RUN apt-get install -y nodejs

FROM dual AS builder
WORKDIR /app
COPY package.json bun.lockb tsconfig.json ./
RUN  bun install --frozen-lockfile
# we need to generate prisma files before building to prevent type errors
COPY ./prisma/migrations ./prisma/migrations/
COPY ./prisma/schema.prisma ./prisma/schema.prisma
RUN bunx prisma generate

COPY . .
# the build command generates a few things, such as i18n outputs
# therefore we need to run the build command BEFORE we check for correctness
RUN bun run build
RUN bun run check
# remove all dependencies which are unused
# TODO https://github.com/oven-sh/bun/issues/3605

FROM base AS release
WORKDIR /app
# the runtime dependencies
COPY --from=builder /app/node_modules ./node_modules/
# the sveltekit output
COPY --from=builder /app/build .
# the prisma schema and migrations
COPY --from=builder /app/prisma ./prisma/

ENV NODE_ENV=production
USER bun
EXPOSE 3000/tcp
# HEALTHCHECK --interval=15s --timeout=10s --retries=3 CMD curl -f http://0.0.0.0:3000/api/health/ready || exit 1
CMD bunx prisma migrate deploy && bun run start