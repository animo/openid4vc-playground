FROM node:22 AS base
COPY package.json /app/package.json

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest
RUN corepack enable

WORKDIR /app

FROM base AS prod-deps
COPY agent/package.json /app/agent/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter agent install --prod

FROM base AS build

COPY agent/package.json /app/agent/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . /app

RUN pnpm --filter agent build

FROM base

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/agent/node_modules /app/agent/node_modules
COPY --from=build /app/agent/dist /app/agent/dist
COPY agent/assets /app/agent/assets

EXPOSE 3000
CMD [ "node", "agent/dist/server.js" ]
