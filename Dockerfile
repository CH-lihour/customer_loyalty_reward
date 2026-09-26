# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.3 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 8443

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "8443"]
