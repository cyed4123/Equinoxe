# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Install from the lockfile only, so image builds are reproducible.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

ENV PORT=3000
EXPOSE 3000

USER node
CMD ["node", "index.js"]
