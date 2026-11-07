FROM node:26-slim
RUN npm install -g pnpm@11.26.0
RUN mkdir -p /app/node_modules /app/.next /pnpm-store && chown -R node:node /app /pnpm-store
ENV pnpm_config_store_dir=/pnpm-store
USER node
