#!/usr/bin/env bash

# KagamiMe Simple Installation Script
# Made with <3 by NullMeDev
# Version 2025.1

set -e

APP_NAME="kagamime"
INSTALL_DIR="/opt/$APP_NAME"

# Error handling
error() {
    echo "[ERROR] $1" >&2
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (with sudo)"
fi

echo "Installing KagamiMe..."

# Install dependencies
apt update || error "Failed to update package lists"
apt install -y curl sqlite3 build-essential nodejs npm || error "Failed to install dependencies"

# Create installation directory if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR" || error "Failed to create installation directory"
fi

# Copy current directory contents to installation directory if needed
if [ "$(pwd)" != "$INSTALL_DIR" ]; then
    cp -r ./* "$INSTALL_DIR/" || error "Failed to copy files to installation directory"
fi

# Switch to installation directory
cd "$INSTALL_DIR" || error "Failed to change to installation directory"

# Install dependencies and build
npm ci || error "Failed to install npm dependencies"
npm run build || error "Failed to build the project"

# Initialize the database if script exists
if [ -f "init-database.js" ]; then
    node init-database.js || error "Failed to initialize database"
fi

echo "$APP_NAME installed at $INSTALL_DIR – edit .env as needed"
echo "You can start the service manually with: node $INSTALL_DIR/dist/index.js"

