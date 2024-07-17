FROM oven/bun:debian AS base

FROM base AS dual
WORKDIR /temp
RUN apt-get -y update; apt-get -y install curl
# we need to use node and bun for generating prisma files, see https://github.com/prisma/prisma/issues/21241
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash
RUN apt-get install -y nodejs

FROM dual AS install
WORKDIR /temp/workdir
COPY package.json bun.lockb ./
RUN  bun install

FROM install AS prisma
WORKDIR /temp/workdir
COPY ./prisma/migrations ./prisma/migrations/
COPY ./prisma/schema.prisma ./prisma/schema.prisma
RUN bunx prisma generate

FROM prisma AS builder
WORKDIR /temp/workdir
COPY . .
RUN bun run build

FROM dual AS release
WORKDIR /app/prod
# the runtime dependencies
COPY --from=builder /temp/workdir/node_modules ./node_modules/
# the sveltekit output
COPY --from=builder /temp/workdir/build .
# the prisma schema and migrations
COPY --from=builder /temp/workdir/prisma ./prisma/

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=127.0.0.1
USER bun
EXPOSE 3000/tcp
HEALTHCHECK --interval=15s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/api/health/ready || exit 1
CMD bunx prisma migrate deploy && bun run start