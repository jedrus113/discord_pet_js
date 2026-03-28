FROM docker.io/node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development

# `npm ci` on start restores node_modules when you bind-mount the repo (mount hides image layers).
CMD ["sh", "-c", "npm ci && exec npm run dev"]
