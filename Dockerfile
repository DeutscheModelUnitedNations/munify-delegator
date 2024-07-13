FROM oven/bun:latest AS install
WORKDIR /temp/dev
COPY frontend/package.json /temp/dev/frontend/package.json
RUN cd /temp/dev/frontend && bun install --frozen-lockfile

FROM oven/bun:latest AS build
ARG VITE_FRONTEND_URL
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
WORKDIR /temp/dev/frontend
COPY frontend /temp/dev/frontend
COPY --from=install /temp/dev/frontend/node_modules ./node_modules
RUN bun run build

FROM oven/bun:latest AS release
WORKDIR /app
COPY --from=build /temp/dev/frontend/node_modules /app/node_modules
COPY --from=build /temp/dev/frontend/build /app/build
COPY --from=build /temp/dev/frontend/static /app/static
EXPOSE 3000
CMD ["bun", "./build/index.js"]