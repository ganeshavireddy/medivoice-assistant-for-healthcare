FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy source code and files
COPY frontend/index.html ./
COPY frontend/src ./src
COPY frontend/vite.config* ./
COPY frontend/tsconfig* ./

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
