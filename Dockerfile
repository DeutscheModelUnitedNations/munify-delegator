FROM oven/bun:1.3-slim AS base

FROM base AS dual
WORKDIR /temp
RUN apt-get -y update; apt-get -y install curl
# we need to use node and bun for generating prisma files, see https://github.com/prisma/prisma/issues/21241
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash
RUN apt-get install -y nodejs

FROM dual AS runner
WORKDIR /run

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA

COPY ./prisma ./prisma/
RUN bunx prisma generate

COPY . .
RUN bun run build
RUN bun run check

RUN mkdir /run/ephemeralData
RUN chown -R bun:bun /run/ephemeralData

USER bun
ENV NODE_ENV=production
EXPOSE 3000/tcp
CMD ["sh", "-c", "bunx prisma migrate deploy && bun ./build/index.js"]
