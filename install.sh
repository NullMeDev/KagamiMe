#!/bin/bash

# KagamiMe (KagamiMe) Enhanced Installation Script
# Ubuntu 24.04 Compatible - Automated Setup with Style
# Made with <3 by NullMeDev
# Fixed version - 2025 update

set -e

# Colors for output
PURPLE='\033[0;35m'
BRIGHT_PURPLE='\033[1;35m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
# Note: This script assumes the repository has already been manually downloaded
DEFAULT_INSTALL_DIR="/opt/kagamime"
DEFAULT_SERVICE_USER="kagamime"
NODE_VERSION="18"
VERSION="0.4.2"

# Installation options
INSTALL_DIR=""
SERVICE_USER=""
USE_CURRENT_DIR=false

# ASCII Art Function
show_ascii_art() {
    echo -e "${BRIGHT_PURPLE}"
    echo "╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗"
    echo "╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ "
    echo "╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝"
    echo -e "${NC}"
    echo -e "${PURPLE}        Made with <3 by NullMeDev${NC}"
    echo -e "${CYAN}        The best fake-news fighter (KagamiMe)${NC}"
    echo ""
}

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

# Parse command-line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dir=*)
                INSTALL_DIR="${1#*=}"
                ;;
            --user=*)
                SERVICE_USER="${1#*=}"
                ;;
            --current)
                USE_CURRENT_DIR=true
                ;;
            --help)
                echo "KagamiMe Installation Script v${VERSION}"
                echo
                echo "Usage: $0 [options]"
                echo
                echo "Options:"
                echo "  --dir=PATH        Specify installation directory (default: $DEFAULT_INSTALL_DIR)"
                echo "  --user=NAME       Specify service user name (default: $DEFAULT_SERVICE_USER)"
                echo "  --current         Use current directory for installation"
                echo "  --help            Show this help message"
                echo
                exit 0
                ;;
            *)
                warning "Unknown option: $1"
                ;;
        esac
        shift
    done

    # Use current directory if requested
    if [ "$USE_CURRENT_DIR" = true ]; then
        INSTALL_DIR="$(pwd)"
        info "Using current directory for installation: $INSTALL_DIR"
    fi

    # Set default installation directory if not specified
    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="$DEFAULT_INSTALL_DIR"
    fi
    
    # Set default service user if not specified
    if [ -z "$SERVICE_USER" ]; then
        # If installing to a non-standard location, derive user from directory name
        if [ "$INSTALL_DIR" != "$DEFAULT_INSTALL_DIR" ]; then
            # Extract the last directory name and use it as username
            SERVICE_USER=$(basename "$INSTALL_DIR")
            # Sanitize the username (replace non-alphanumeric with underscore)
            SERVICE_USER=$(echo "$SERVICE_USER" | tr -c '[:alnum:]' '_' | tr '[:upper:]' '[:lower:]')
            info "Derived service user from directory name: $SERVICE_USER"
        else
            SERVICE_USER="$DEFAULT_SERVICE_USER"
        fi
    fi
}

# Check if running as root and set a flag
IS_ROOT=false
if [[ $EUID -eq 0 ]]; then
    IS_ROOT=true
fi

# Check Ubuntu version
check_ubuntu_version() {
    if [[ ! -f /etc/os-release ]]; then
        error "Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        warning "This script is optimized for Ubuntu 24.04"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "Detected: $PRETTY_NAME"
}

# Check and install Node.js (Ubuntu 24.04 compatible)
install_nodejs() {
    log "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
            log "Node.js $NODE_CURRENT detected - compatible version found"
            return 0
        else
            warning "Node.js version $NODE_CURRENT is too old (need $NODE_VERSION+)"
        fi
    fi
    
    log "Installing Node.js $NODE_VERSION..."
    
    # Use NodeSource repository for Ubuntu 24.04 compatibility
    # When running as root, we don't need sudo
    if [ "$IS_ROOT" = true ]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
    else
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    log "Node.js $(node --version) installed successfully"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # When running as root, we don't need sudo
    if [ "$IS_ROOT" = true ]; then
        apt-get update
    else
        sudo apt-get update
    fi
    
    # Only install packages that aren't already present
    PACKAGES=(
        "curl"
        "build-essential"
        "python3"
        "sqlite3"
        "systemd"
    )
    
    for package in "${PACKAGES[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            info "Installing $package..."
            if [ "$IS_ROOT" = true ]; then
                apt-get install -y "$package"
            else
                sudo apt-get install -y "$package"
            fi
        else
            info "$package already installed - skipping"
        fi
    done
}

# Create service user
create_user() {
    # If we're in the current directory or home directory, use the current user
    if [[ "$INSTALL_DIR" == "$HOME"* ]] || [[ "$INSTALL_DIR" == "$(pwd)"* ]] || [ "$USE_CURRENT_DIR" = true ]; then
        log "Using current user for installation in home directory"
        if [ "$IS_ROOT" = true ]; then
            # If running as root, use the SUDO_USER if available
            if [ -n "$SUDO_USER" ]; then
                SERVICE_USER="$SUDO_USER"
                log "Using the original user: $SERVICE_USER"
            else
                SERVICE_USER="root"
                log "Using root user for installation"
            fi
        else
            SERVICE_USER="$(whoami)"
        fi
        return 0
    fi

    if ! id "$SERVICE_USER" &>/dev/null; then
        log "Creating service user: $SERVICE_USER"
        if [ "$IS_ROOT" = true ]; then
            useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
        else
            sudo useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
        fi
    else
        log "User $SERVICE_USER already exists"
    fi
}

# Setup repository directory
setup_repository() {
    log "Setting up KagamiMe repository directory..."
    
    # Check if the installation directory exists
    if [[ ! -d "$INSTALL_DIR" ]]; then
        # If the directory doesn't exist, but we're using current dir, there's a problem
        if [ "$USE_CURRENT_DIR" = true ]; then
            error "Current directory does not exist? This should not happen."
            exit 1
        fi
        
        # Otherwise, try to create the directory
        log "Creating installation directory: $INSTALL_DIR"
        if [ "$IS_ROOT" = true ]; then
            mkdir -p "$INSTALL_DIR"
        else
            sudo mkdir -p "$INSTALL_DIR"
        fi
        
        error "Installation directory $INSTALL_DIR created but is empty."
        error "Please manually download the repository files to this directory first."
        exit 1
    fi
    
    # Verify it's a valid repository
    if [[ ! -f "$INSTALL_DIR/package.json" ]]; then
        error "The directory $INSTALL_DIR does not appear to contain valid KagamiMe files."
        error "Please ensure you have manually downloaded the repository files correctly."
        exit 1
    fi
    
    # Set ownership - only if we're not using the current user's directory
    if [ "$SERVICE_USER" != "$(whoami)" ] && [ "$SERVICE_USER" != "root" ]; then
        log "Setting correct ownership on repository directory..."
        if [ "$IS_ROOT" = true ]; then
            chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
        else
            sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
        fi
    fi
    
    cd "$INSTALL_DIR"
    
    log "Repository setup completed."
}

# Interactive configuration
configure_environment() {
    log "Setting up environment configuration..."
    
    ENV_FILE="$INSTALL_DIR/.env"
    
    echo -e "${BOLD}${PURPLE}[+] KagamiMe Configuration Setup${NC}"
    echo "Please provide the following information:"
    echo ""
    
    # Discord Token
    echo -e "${CYAN}Discord Bot Token:${NC}"
    echo "Get this from: https://discord.com/developers/applications"
    read -p "Discord Token: " -r DISCORD_TOKEN
    
    # Client ID
    read -p "Discord Client ID: " -r CLIENT_ID
    
    # Guild ID
    read -p "Discord Server ID: " -r GUILD_ID
    
    # Notification Channel
    read -p "Notification Channel ID: " -r NOTIFY_CHANNEL_ID
    
    # Owner ID
    read -p "Your Discord User ID (Owner): " -r OWNER_ID
    
    # OpenAI API Key (optional)
    echo ""
    echo -e "${YELLOW}Multi-API Fact-Checking Configuration:${NC}"
    echo -e "${CYAN}OpenAI API Key (for intelligent fact-checking):${NC}"
    read -p "OpenAI API Key (leave blank to skip): " -r OPENAI_API_KEY
    
    # ClaimBuster API Key (optional)
    echo -e "${CYAN}ClaimBuster API Key (for claim worthiness analysis):${NC}"
    echo "Get this from: https://idir.uta.edu/claimbuster/api/"
    read -p "ClaimBuster API Key (leave blank to skip): " -r CLAIMBUSTER_API_KEY
    
    # Google Fact Check API Key (optional)
    echo -e "${CYAN}Google Fact Check Tools API Key (for verified fact-checks):${NC}"
    echo -e "${YELLOW}Setup Guide:${NC}"
    echo "1. Go to: https://console.cloud.google.com/"
    echo "2. Enable 'Fact Check Tools API' in API Library"
    echo "3. Create API Key in Credentials section"
    echo "4. Restrict key to 'Fact Check Tools API' (recommended)"
    echo -e "${YELLOW}Note: API key format is like 'AIzaSyD...'${NC}"
    read -p "Google Fact Check API Key (leave blank to skip): " -r GOOGLE_FACTCHECK_API_KEY
    
    # Admin Role ID (optional)
    echo ""
    read -p "Admin Role ID (optional): " -r ADMIN_ROLE_ID
    
    # Generate .env file - use sudo only if we're not the service user
    # If running as root, just write the file directly
    ENV_CONTENT="# KagamiMe Environment Configuration
# Generated on $(date)

# Discord Bot Configuration
DISCORD_TOKEN=$DISCORD_TOKEN
CLIENT_ID=$CLIENT_ID
GUILD_ID=$GUILD_ID
NOTIFY_CHANNEL_ID=$NOTIFY_CHANNEL_ID
OWNER_ID=$OWNER_ID

# Multi-API Fact-Checking Configuration
OPENAI_API_KEY=$OPENAI_API_KEY
CLAIMBUSTER_API_KEY=$CLAIMBUSTER_API_KEY
GOOGLE_FACTCHECK_API_KEY=$GOOGLE_FACTCHECK_API_KEY

# Admin Configuration
ADMIN_ROLE_ID=$ADMIN_ROLE_ID

# Database Configuration
DATABASE_PATH=data/kagamime.db

# Bot Configuration
BOT_NAME=KagamiMe
BOT_PREFIX=!
VERSION=v0.4.2

# Cron Settings
RSS_CHECK_INTERVAL=*/30 * * * *
DIGEST_TIME=0 8 * * *

# Update Settings
AUTO_UPDATE_ENABLED=true
UPDATE_CHECK_INTERVAL=0 */6 * * *"

    if [ "$IS_ROOT" = true ]; then
        echo "$ENV_CONTENT" > "$ENV_FILE"
        # If we have a non-root service user, set proper ownership
        if [ "$SERVICE_USER" != "root" ]; then
            chown "$SERVICE_USER:$SERVICE_USER" "$ENV_FILE"
        fi
    elif [ "$SERVICE_USER" != "$(whoami)" ]; then
        echo "$ENV_CONTENT" | sudo -u "$SERVICE_USER" tee "$ENV_FILE" > /dev/null
    else
        echo "$ENV_CONTENT" > "$ENV_FILE"
    fi
}

# Setup systemd service
setup_systemd() {
    log "Setting up systemd service..."
    
    SYSTEMD_FILE="/etc/systemd/system/kagamime.service"
    SERVICE_CONTENT="[Unit]
Description=KagamiMe Discord Bot
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=kagamime
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target"

    if [ "$IS_ROOT" = true ]; then
        echo "$SERVICE_CONTENT" > "$SYSTEMD_FILE"
    else
        echo "$SERVICE_CONTENT" | sudo tee "$SYSTEMD_FILE" > /dev/null
    fi
    
    if [ "$IS_ROOT" = true ]; then
        systemctl daemon-reload
        systemctl enable kagamime.service
    else
        sudo systemctl daemon-reload
        sudo systemctl enable kagamime.service
    fi
    
    log "Systemd service installed and enabled"
}

# Install dependencies
install_npm_dependencies() {
    log "Installing npm dependencies..."
    
    cd "$INSTALL_DIR"
    
    if [ "$SERVICE_USER" != "$(whoami)" ] && [ "$SERVICE_USER" != "root" ]; then
        if [ "$IS_ROOT" = true ]; then
            sudo -u "$SERVICE_USER" npm install
        else
            sudo -u "$SERVICE_USER" npm install
        fi
    else
        npm install
    fi
    
    log "Building TypeScript project..."
    if [ "$SERVICE_USER" != "$(whoami)" ] && [ "$SERVICE_USER" != "root" ]; then
        if [ "$IS_ROOT" = true ]; then
            sudo -u "$SERVICE_USER" npm run build
        else
            sudo -u "$SERVICE_USER" npm run build
        fi
    else
        npm run build
    fi
    
    log "Dependencies installed and project built successfully"
}

# Create database
setup_database() {
    log "Setting up database..."
    
    cd "$INSTALL_DIR"
    
    # Create data directory if it doesn't exist
    if [ ! -d "data" ]; then
        mkdir -p data
    fi
    
    # Initialize database if needed
    if [ -f "init-database.js" ]; then
        log "Initializing database..."
        if [ "$SERVICE_USER" != "$(whoami)" ] && [ "$SERVICE_USER" != "root" ]; then
            if [ "$IS_ROOT" = true ]; then
                sudo -u "$SERVICE_USER" node init-database.js
            else
                sudo -u "$SERVICE_USER" node init-database.js
            fi
        else
            node init-database.js
        fi
    else
        warning "Database initialization script not found. Database may need to be set up manually."
    fi
    
    log "Database setup completed"
}

# Start the bot
start_bot() {
    log "Starting KagamiMe bot..."
    
    if [ "$IS_ROOT" = true ]; then
        systemctl start kagamime.service
    else
        sudo systemctl start kagamime.service
    fi
    
    log "Bot started successfully!"
}

# Main function
main() {
    clear
    show_ascii_art
    echo -e "${BOLD}KagamiMe Installation Script v${VERSION}${NC}"
    echo -e "${CYAN}This script will install KagamiMe on your Ubuntu system.${NC}"
    echo ""
    
    # Parse command-line arguments
    parse_arguments "$@"
    
    # Show installation details
    log "Installation directory: $INSTALL_DIR"
    log "Service user: $SERVICE_USER"
    echo
    
    # Confirmation
    read -p "Do you want to continue with the installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation aborted."
        exit 0
    fi
    
    check_ubuntu_version
    install_dependencies
    install_nodejs
    create_user
    setup_repository
    configure_environment
    install_npm_dependencies
    setup_database
    setup_systemd
    
    echo ""
    read -p "Do you want to start the bot now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_bot
    else
        log "Bot not started. You can start it later with: sudo systemctl start kagamime.service"
    fi
    
    log "Installation completed successfully!"
    echo ""
    echo -e "${GREEN}Thank you for installing KagamiMe!${NC}"
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  ${YELLOW}Start:${NC}   sudo systemctl start kagamime.service"
    echo -e "  ${YELLOW}Stop:${NC}    sudo systemctl stop kagamime.service"
    echo -e "  ${YELLOW}Status:${NC}  sudo systemctl status kagamime.service"
    echo -e "  ${YELLOW}Logs:${NC}    sudo journalctl -u kagamime.service -f"
    echo ""
    echo -e "${PURPLE}Made with <3 by NullMeDev${NC}"
}

# Execute main function with all arguments
main "$@"

