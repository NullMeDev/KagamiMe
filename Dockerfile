# KagamiMe Dockerfile
# A minimal Docker configuration for the KagamiMe Discord bot
# 
# This Dockerfile:
# - Uses Node.js 18.x as specified in the project requirements
# - Installs production dependencies only
# - Builds the TypeScript code
# - Creates a production-ready image with minimal size

# -----------------------------------------------------------------------------
# Build stage: Compile TypeScript and prepare production dependencies
# -----------------------------------------------------------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies, including SQLite
RUN apk add --no-cache python3 make g++ sqlite

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# -----------------------------------------------------------------------------
# Production stage: Create minimal runtime image
# -----------------------------------------------------------------------------
FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache sqlite

# Create data directory for SQLite database and ensure it's writable
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy required files
COPY .env.sample .env.example

# Create a non-root user and switch to it for security
RUN addgroup -S kagamime && adduser -S kagamime -G kagamime
USER kagamime

# Expose volume for persistent data (SQLite database, logs, etc.)
VOLUME ["/app/data"]

# Command to run the application
CMD ["node", "dist/index.js"]

# Health check (basic process check)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)"

# Metadata
LABEL maintainer="KagamiMe Maintainers"
LABEL version="2.2.0"
LABEL description="KagamiMe - Your sovereign, anime-inspired sentinel on the digital horizon"


