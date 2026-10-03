FROM oven/bun:1.3-slim AS base

FROM base AS dual
WORKDIR /temp
# Apply OS security updates (e.g. libcap2 CVE-2026-4878) on top of the base image.
# CI passes the current date so this layer is rebuilt daily instead of being served from a
# build cache that predates newer Debian security fixes.
ARG OS_UPDATES_DATE
RUN echo "OS updates as of ${OS_UPDATES_DATE:-unknown}"; apt-get -y update; apt-get -y upgrade; apt-get -y install curl
# we need to use node and bun for generating prisma files, see https://github.com/prisma/prisma/issues/21241
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash
# Only the node binary is needed (everything else runs through bun/bunx). Drop the npm bundled
# with nodejs: it ships its own outdated copies of e.g. brace-expansion and undici that the
# Trivy image scan flags and that package.json overrides cannot reach.
RUN apt-get install -y nodejs && rm -rf /usr/lib/node_modules/npm /usr/bin/npm /usr/bin/npx

FROM dual AS runner
WORKDIR /run

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

ARG VERSION
ENV PUBLIC_VERSION=$VERSION
ARG SHA
ENV PUBLIC_SHA=$SHA

COPY . .
RUN bunx prisma generate
# Increase Node.js heap size for build (default is too small for large codebases)
ENV NODE_OPTIONS="--max-old-space-size=8192"
# `bun run check` is not repeated here: the CI `typecheck` job runs the same command and is in
# the docker-build `needs` list, so the image is only built once it has already passed.
RUN bun run build:app

USER bun
ENV NODE_ENV=production
# adapter-node caps request bodies at 512K by default and rejects anything larger with
# HTTP 413 before the request reaches the app. Conference document/image uploads (base
# PDFs are validated up to 10MB each in the Zod schema, and several can be sent in one
# save) exceed that. Raise the limit so uploads actually reach the server. Overridable at
# runtime via the BODY_SIZE_LIMIT env var (see .env.example).
ENV BODY_SIZE_LIMIT=64M
EXPOSE 3000/tcp
CMD ["sh", "-c", "bunx prisma migrate deploy && bun ./build/index.js"]
