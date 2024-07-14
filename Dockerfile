FROM oven/bun:debian AS base

FROM base AS dual
WORKDIR /temp
RUN apt-get -y update; apt-get -y install curl
# we need to use node and bun for generating prisma files, see https://github.com/prisma/prisma/issues/21241
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash
RUN apt-get install -y nodejs

FROM dual AS install
WORKDIR /temp/install
COPY package.json bun.lockb ./
RUN  bun install

FROM dual AS prisma
WORKDIR /temp/prisma
COPY --from=install /temp/install .

COPY ./prisma/migrations ./prisma/migrations/
COPY ./prisma/schema.prisma ./prisma/schema.prisma
RUN bunx prisma generate

FROM dual AS builder
WORKDIR /app/staging
COPY . .
COPY --from=prisma /temp/prisma .
RUN ls -l && bun run build

FROM dual AS release
WORKDIR /app/prod
COPY --from=builder /app/staging/build .
# we need the generated prisma files at runtime since it contains the migration files
COPY --from=prisma /temp/prisma/prisma ./prisma/
# this installs runtime dependencies
RUN bun install

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=127.0.0.1
USER bun
EXPOSE 3000/tcp
HEALTHCHECK --interval=15s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/health/ready || exit 1
CMD bunx prisma migrate deploy && bun run start