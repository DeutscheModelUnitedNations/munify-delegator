FROM oven/bun:slim AS base

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
# we check for errors
RUN bun run check
# now we can build the app
RUN bun run build
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
HEALTHCHECK --interval=15s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/api/health/ready || exit 1
CMD bunx prisma migrate deploy && bun run start