FROM node:20 AS base

COPY package.json /app/package.json

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest
RUN corepack enable

WORKDIR /app

FROM base AS prod-deps
COPY tsconfig.json /app/tsconfig.json
COPY patches /app/patches

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

FROM base AS build
COPY tsconfig.json /app/tsconfig.json
COPY patches /app/patches

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
COPY src src
RUN pnpm run build

FROM base

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY assets /app/assets

EXPOSE 3000
CMD [ "node", "dist/server.js" ]
