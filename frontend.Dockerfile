FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY --chown=node:node frontend/package.json frontend/package-lock.json* 2>/dev/null ./
RUN npm ci

# Copy source code
COPY --chown=node:node frontend/src ./src
COPY --chown=node:node frontend/vite.config* 2>/dev/null ./
COPY --chown=node:node frontend/tsconfig* 2>/dev/null ./

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
