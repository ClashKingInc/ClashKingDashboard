# syntax=docker/dockerfile:1.7

FROM node:26.1.0-alpine AS base
WORKDIR /app
RUN --mount=type=cache,target=/root/.npm npm install --global npm@12.0.1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS builder
ARG VITE_CLASHKING_API_ORIGIN=https://api.clashk.ing
ARG VITE_CLASHKING_AI_ORIGIN=https://ai.clashk.ing
ARG VITE_DISCORD_CLIENT_ID=824653933347209227
ENV VITE_CLASHKING_API_ORIGIN=$VITE_CLASHKING_API_ORIGIN
ENV VITE_CLASHKING_AI_ORIGIN=$VITE_CLASHKING_AI_ORIGIN
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/client /usr/share/nginx/html
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/"]
