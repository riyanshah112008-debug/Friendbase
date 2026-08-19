# Dockerfile for Friendbase - Node 18 on Debian slim (better compatibility for native modules)
FROM node:18-bullseye-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install system deps required by modules like canvas, better-sqlite3 and ffmpeg
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Copy package manifest and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

EXPOSE 3000
CMD ["node", "src/boot.js"]
