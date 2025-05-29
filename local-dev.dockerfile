# Ubuntu 24.04 base image
FROM ubuntu:noble

# Set environment variables to avoid interactive installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port(s) the app will run on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
