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
REPO_URL="https://github.com/nullmedev/kagamime.git"
INSTALL_DIR="/opt/kagamime"
SERVICE_USER="kagamime"
NODE_VERSION="18"
VERSION="0.4.2"

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
        "git"
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
    if ! id "$SERVICE_USER" &>/dev/null; then
        log "Creating service user: $SERVICE_USER"
        sudo useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
    else
        log "User $SERVICE_USER already exists"
    fi
}

# Clone or update repository
setup_repository() {
    log "Setting up KagamiMe repository..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        warning "Installation directory exists. Backing up..."
        sudo mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%s)"
    fi
    
    log "Cloning repository from $REPO_URL..."
    sudo git clone "$REPO_URL" "$INSTALL_DIR"
    sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    
    cd "$INSTALL_DIR"
    sudo -u "$SERVICE_USER" git config --global --add safe.directory "$INSTALL_DIR"
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
    
    # Generate .env file
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
    
    log "Environment configuration saved to $ENV_FILE"
}

# Install Node.js dependencies
install_node_dependencies() {
    log "Installing Node.js dependencies..."
    
    cd "$INSTALL_DIR"
    
    # Install dependencies as kagamime user
    sudo -u "$SERVICE_USER" npm install
    
    # Build TypeScript
    log "Building TypeScript project..."
    sudo -u "$SERVICE_USER" npm run build
}

# Initialize database
initialize_database() {
    log "Initializing database..."
    
    cd "$INSTALL_DIR"
    
    # Create data directory
    sudo -u "$SERVICE_USER" mkdir -p data
    
    # Initialize database
    sudo -u "$SERVICE_USER" node init-database.js
}

# Setup systemd service
setup_systemd_service() {
    log "Setting up systemd service..."
    
    sudo cp "$INSTALL_DIR/systemd/kagamime-bot.service" /etc/systemd/system/
    
    # Update service file with correct paths
    sudo sed -i "s|/opt/kagamime|$INSTALL_DIR|g" /etc/systemd/system/kagamime-bot.service
    sudo sed -i "s|User=kagamime|User=$SERVICE_USER|g" /etc/systemd/system/kagamime-bot.service
    
    sudo systemctl daemon-reload
    sudo systemctl enable kagamime-bot
    
    log "Systemd service configured and enabled"
}

# Create shell aliases
create_aliases() {
    log "Creating shell aliases..."
    
    ALIAS_FILE="/usr/local/bin/kagamime-aliases"
    
    sudo tee "$ALIAS_FILE" > /dev/null <<'EOF'
#!/bin/bash
# KagamiMe Shell Aliases

alias kagamime-start='sudo systemctl start kagamime-bot'
alias kagamime-stop='sudo systemctl stop kagamime-bot'
alias kagamime-restart='sudo systemctl restart kagamime-bot'
alias kagamime-status='sudo systemctl status kagamime-bot'
alias kagamime-logs='sudo journalctl -u kagamime-bot -f'
alias kagamime-logs-tail='sudo journalctl -u kagamime-bot --no-pager -n 50'
alias kagamime-update='cd /opt/kagamime && sudo -u kagamime git pull && sudo -u kagamime npm install && sudo -u kagamime npm run build && sudo systemctl restart kagamime-bot'
EOF
    
    sudo chmod +x "$ALIAS_FILE"
    
    # Add to system profile
    echo "source $ALIAS_FILE" | sudo tee -a /etc/profile.d/kagamime.sh > /dev/null
    
    log "Shell aliases created. Source with: source $ALIAS_FILE"
}

# Create version tracking
create_version_system() {
    log "Setting up version tracking system..."
    
    VERSION_FILE="$INSTALL_DIR/version.json"
    
    sudo -u "$SERVICE_USER" tee "$VERSION_FILE" > /dev/null <<EOF
{
    "version": "v0.4.2",
    "build": "$(date +%s)",
    "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "gitCommit": "$(cd $INSTALL_DIR && git rev-parse HEAD)",
    "features": [
        "Discord bot with anime-inspired personality",
        "RSS feed monitoring and news harvesting",
        "SQLite database with complete schema",
        "Multi-API fact-checking (OpenAI + ClaimBuster + Google)",
        "Auto-update system with Discord notifications",
        "Admin commands for RSS management",
        "Server management through Discord",
        "Automated installation and updates",
        "Version tracking and changelog system"
    ],
    "changelog": {
        "v0.4.2": {
            "date": "$(date -u +%Y-%m-%d)",
            "type": "major",
            "changes": [
                "Enhanced installation script with Ubuntu 24.04 support",
                "Multi-API fact-checking system (OpenAI + ClaimBuster + Google)",
                "Automated update system with Discord notifications",
                "Version tracking and changelog system",
                "Midnight purple ASCII art and NullMeDev attribution",
                "Interactive configuration setup with API key management",
                "Improved error handling and logging"
            ]
        }
    }
}
EOF
    
    log "Version tracking system initialized at v0.4.2"
}

# Final verification
verify_installation() {
    log "Verifying installation..."
    
    # Check if all files exist
    local errors=0
    
    if [[ ! -f "$INSTALL_DIR/dist/index.js" ]]; then
        error "Build files not found"
        ((errors++))
    fi
    
    if [[ ! -f "$INSTALL_DIR/.env" ]]; then
        error "Environment file not found"
        ((errors++))
    fi
    
    if [[ ! -f "/etc/systemd/system/kagamime-bot.service" ]]; then
        error "Systemd service not found"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        log "Installation verification successful!"
        return 0
    else
        error "Installation verification failed with $errors errors"
        return 1
    fi
}

# Installation summary
show_summary() {
    echo ""
    echo -e "${BOLD}${BRIGHT_PURPLE}[+] KagamiMe Installation Complete! [+]${NC}"
    echo ""
    echo -e "${GREEN}[+] Repository cloned and configured${NC}"
    echo -e "${GREEN}[+] Dependencies installed${NC}"
    echo -e "${GREEN}[+] Environment configured${NC}"
    echo -e "${GREEN}[+] Database initialized${NC}"
    echo -e "${GREEN}[+] Systemd service setup${NC}"
    echo -e "${GREEN}[+] Version tracking enabled (v0.4.2)${NC}"
    echo -e "${GREEN}[+] Auto-update system configured${NC}"
    echo ""
    echo -e "${BOLD}${CYAN}[>] Quick Start Commands:${NC}"
    echo -e "${PURPLE}  kagamime-start${NC}     - Start KagamiMe"
    echo -e "${PURPLE}  kagamime-status${NC}    - Check status"
    echo -e "${PURPLE}  kagamime-logs${NC}      - View live logs"
    echo -e "${PURPLE}  kagamime-restart${NC}   - Restart bot"
    echo ""
    echo -e "${BOLD}${YELLOW}[!] Ready to Start:${NC}"
    echo -e "${CYAN}  sudo systemctl start kagamime-bot${NC}"
    echo ""
    echo -e "${PURPLE}Made with <3 by NullMeDev${NC}"
    echo -e "${CYAN}Your anime-inspired Discord sentinel awaits! (KagamiMe)${NC}"
}

# Main installation function
main() {
    show_ascii_art
    
    log "Starting KagamiMe enhanced installation..."
    
    check_root
    check_ubuntu_version
    install_nodejs
    install_dependencies
    create_user
    setup_repository
    configure_environment
    install_node_dependencies
    initialize_database
    create_version_system
    setup_systemd_service
    create_aliases
    
    if verify_installation; then
        show_summary
        
        echo ""
        read -p "Would you like to start KagamiMe now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Starting KagamiMe..."
            sudo systemctl start kagamime-bot
            sleep 3
            sudo systemctl status kagamime-bot --no-pager
        fi
    else
        error "Installation completed with errors. Please check the logs."
        exit 1
    fi
}

# Run main function
main "$@"
