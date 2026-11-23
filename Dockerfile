# Google Cloud Run Backend Container for Quiz Bee Competition System
# Uses Node 24 LTS (includes native node:sqlite used as ephemeral in-container cache)
FROM node:24-slim

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source files
COPY server ./server

# Cloud Run runtime defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV SQLITE_DB_PATH=/tmp/quizbee.db

EXPOSE 8080

CMD ["node", "--no-warnings=ExperimentalWarning", "server/index.js"]
