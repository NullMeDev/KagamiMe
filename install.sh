#!/bin/bash

# KagamiMe (KagamiMe) Enhanced Installation Script
# Ubuntu 24.04 Compatible - Automated Setup with Style
# Made with <3 by NullMeDev

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root directly."
        error "It will prompt for sudo when needed."
        exit 1
    fi
}

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
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    log "Node.js $(node --version) installed successfully"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    sudo apt-get update
    
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
            sudo apt-get install -y "$package"
        else
            info "$package already installed - skipping"
        fi
    done
}

# Create service user
create_user() {
    if [ "$INSTALL_DIR" == "$HOME" ] || [ "$INSTALL_DIR" == "$(pwd)" ]; then
        log "Using current user for installation in home directory"
        SERVICE_USER="$(whoami)"
        return 0
    fi

    if ! id "$SERVICE_USER" &>/dev/null; then
        log "Creating service user: $SERVICE_USER"
        sudo useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
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
        sudo mkdir -p "$INSTALL_DIR"
        
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
    if [ "$SERVICE_USER" != "$(whoami)" ]; then
        log "Setting correct ownership on repository directory..."
        sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
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
    if [ "$SERVICE_USER" != "$(whoami)" ]; then
        sudo -u "$SERVICE_USER" tee "$ENV_FILE" > /dev/null <<EOF
# KagamiMe Environment Configuration
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
UPDATE_CHECK_INTERVAL=0 */6 * * *
EOF
    else
        # Create the file as the current user
        tee "$ENV_FILE" > /dev/null <<EOF
# KagamiMe Environment Configuration
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
UPDATE_CHECK_INTERVAL=0 */6 * * *
EOF
    fi
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
    
    check_root
    check_ubuntu_version
    install_dependencies
    install_nodejs
    create_user
    setup_repository
    configure_environment
    
    log "Installation completed successfully!"
    log "You can now run KagamiMe by executing: npm start"
    
    echo ""
    echo -e "${GREEN}Thank you for installing KagamiMe!${NC}"
}

# Execute main function with all arguments
main "$@"

