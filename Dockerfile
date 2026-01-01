
# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps

WORKDIR /app

# pnpm via corepack (ships with Node.js)
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Install dependencies based on lockfile for reproducible builds
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile


FROM node:24-alpine AS builder

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Prisma schema must be present for client generation
COPY prisma ./prisma

# Copy sources and build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN pnpm exec prisma generate
RUN pnpm exec nest build

# Prune dev dependencies for a smaller runtime image
RUN pnpm prune --prod


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# If you run `prisma migrate deploy` at container start, Prisma needs the schema too.
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./package.json

# Nest default port (adjust if your app uses a different one)
EXPOSE 3000

# Note: Do NOT run `prisma migrate dev` in Docker.
# If you want migrations on startup, switch CMD to:
# CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
CMD ["node", "dist/src/main.js"]
