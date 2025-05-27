#!/bin/bash
# KagamiMe (鏡眼) Complete Installation and Setup Script
# This script handles everything from cloning to production deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/yourusername/KagamiMe.git"  # Update this with your actual repo
INSTALL_DIR="/opt/kagamime"
SERVICE_USER="kagamime"
SERVICE_NAME="kagamime-bot"
NODE_VERSION="18"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    KagamiMe (鏡眼) Setup                     ║"
    echo "║              Your Digital Sentinel Deployment               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons."
        print_status "Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "This script is designed for Linux systems only."
        exit 1
    fi
    
    # Check for required commands
    local required_commands=("curl" "git" "sudo" "systemctl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            print_error "Required command '$cmd' not found. Please install it first."
            exit 1
        fi
    done
    
    print_success "System requirements check passed"
}

# Install Node.js
install_nodejs() {
    print_status "Installing Node.js $NODE_VERSION..."
    
    if command -v node &> /dev/null; then
        local current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $current_version -ge $NODE_VERSION ]]; then
            print_success "Node.js is already installed ($(node -v))"
            return
        fi
    fi
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    print_success "Node.js $(node -v) installed successfully"
}

# Create service user
create_service_user() {
    print_status "Creating service user '$SERVICE_USER'..."
    
    if id "$SERVICE_USER" &>/dev/null; then
        print_warning "User '$SERVICE_USER' already exists"
        return
    fi
    
    sudo useradd --system --shell /bin/bash --home-dir $INSTALL_DIR --create-home $SERVICE_USER
    sudo usermod -a -G www-data $SERVICE_USER
    
    print_success "Service user '$SERVICE_USER' created"
}

# Clone and setup repository
setup_repository() {
    print_status "Setting up KagamiMe repository..."
    
    # Remove existing directory if it exists
    if [[ -d "$INSTALL_DIR" ]]; then
        print_warning "Installation directory exists. Backing up..."
        sudo mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Clone repository
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR"
    
    print_status "Cloning repository..."
    if [[ -n "$REPO_URL" && "$REPO_URL" != "https://github.com/yourusername/KagamiMe.git" ]]; then
        sudo -u $SERVICE_USER git clone "$REPO_URL" "$INSTALL_DIR"
    else
        print_warning "Repository URL not configured. Creating directory structure..."
        sudo -u $SERVICE_USER mkdir -p "$INSTALL_DIR"/{src,data,db,scripts,systemd}
        
        # Copy current project files if we're in the project directory
        if [[ -f "package.json" && -f "src/index.ts" ]]; then
            print_status "Copying current project files..."
            sudo cp -r . "$INSTALL_DIR/"
            sudo chown -R $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR"
        fi
    fi
    
    cd "$INSTALL_DIR"
    
    print_success "Repository setup complete"
}

# Install dependencies and build
install_dependencies() {
    print_status "Installing dependencies and building project..."
    
    cd "$INSTALL_DIR"
    
    # Install npm dependencies
    sudo -u $SERVICE_USER npm install --production
    
    # Install development dependencies for building
    sudo -u $SERVICE_USER npm install --only=dev
    
    # Build the project
    sudo -u $SERVICE_USER npm run build
    
    # Remove dev dependencies to save space
    sudo -u $SERVICE_USER npm prune --production
    
    print_success "Dependencies installed and project built"
}

# Setup environment configuration
setup_environment() {
    print_status "Setting up environment configuration..."
    
    cd "$INSTALL_DIR"
    
    if [[ ! -f ".env" ]]; then
        print_status "Creating environment configuration..."
        
        cat > /tmp/kagamime.env << 'EOF'
# KagamiMe Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_PATH=./data/kagamime.db

# Bot Settings
BOT_OWNER_ID=your_discord_user_id_here
ADMIN_ROLE_ID=your_admin_role_id_here
NOTIFY_CHANNEL_ID=your_notification_channel_id_here

# RSS and Digest Settings
FETCH_INTERVAL_MINUTES=30
DAILY_DIGEST_TIME=09:00

# Server Settings
NODE_ENV=production
PORT=3000
EOF
        
        sudo mv /tmp/kagamime.env "$INSTALL_DIR/.env"
        sudo chown $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR/.env"
        sudo chmod 600 "$INSTALL_DIR/.env"
        
        print_warning "Please edit $INSTALL_DIR/.env with your actual configuration values"
    else
        print_success "Environment file already exists"
    fi
}

# Create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > /tmp/kagamime-bot.service << EOF
[Unit]
Description=KagamiMe Discord Bot
Documentation=https://github.com/yourusername/KagamiMe
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/node dist/index.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=kagamime-bot

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR

# Resource limits
LimitNOFILE=1024
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
EOF
    
    sudo mv /tmp/kagamime-bot.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    
    print_success "Systemd service created and enabled"
}

# Create management aliases
create_aliases() {
    print_status "Creating management aliases..."
    
    cat > /tmp/kagamime-aliases << 'EOF'
# KagamiMe Bot Management Aliases
alias kagami-start='sudo systemctl start kagamime-bot'
alias kagami-stop='sudo systemctl stop kagamime-bot'
alias kagami-restart='sudo systemctl restart kagamime-bot'
alias kagami-status='sudo systemctl status kagamime-bot'
alias kagami-logs='sudo journalctl -u kagamime-bot -f'
alias kagami-logs-error='sudo journalctl -u kagamime-bot -p err'
alias kagami-update='cd /opt/kagamime && sudo -u kagamime git pull && sudo -u kagamime npm install && sudo -u kagamime npm run build && sudo systemctl restart kagamime-bot'
alias kagami-backup='sudo tar -czf /tmp/kagamime-backup-$(date +%Y%m%d_%H%M%S).tar.gz -C /opt kagamime'
alias kagami-db='sqlite3 /opt/kagamime/data/kagamime.db'
alias kagami-config='sudo nano /opt/kagamime/.env'
EOF
    
    # Add to system-wide aliases
    sudo mv /tmp/kagamime-aliases /etc/profile.d/kagamime-aliases.sh
    sudo chmod +x /etc/profile.d/kagamime-aliases.sh
    
    # Add to current user's bashrc
    if ! grep -q "kagamime-aliases" ~/.bashrc; then
        echo "source /etc/profile.d/kagamime-aliases.sh" >> ~/.bashrc
    fi
    
    print_success "Management aliases created"
}

# Initialize database
initialize_database() {
    print_status "Initializing database..."
    
    cd "$INSTALL_DIR"
    
    # Ensure data directory exists
    sudo -u $SERVICE_USER mkdir -p data
    
    # Initialize database if it doesn't exist
    if [[ ! -f "data/kagamime.db" ]]; then
        print_status "Creating database schema..."
        sudo -u $SERVICE_USER sqlite3 data/kagamime.db < db/schema.sql
        print_success "Database initialized"
    else
        print_success "Database already exists"
    fi
}

# Main installation function
main() {
    print_header
    
    print_status "Starting KagamiMe installation..."
    
    check_root
    check_requirements
    
    # Update system packages
    print_status "Updating system packages..."
    sudo apt-get update
    sudo apt-get install -y curl git sqlite3 build-essential
    
    install_nodejs
    create_service_user
    setup_repository
    install_dependencies
    setup_environment
    initialize_database
    create_systemd_service
    create_aliases
    
    print_success "Installation completed successfully!"
    
    echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    NEXT STEPS                                ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${YELLOW}1. Configure your bot tokens:${NC}"
    echo -e "   sudo nano $INSTALL_DIR/.env"
    echo -e "\n${YELLOW}2. Start the bot:${NC}"
    echo -e "   kagami-start"
    echo -e "\n${YELLOW}3. Check status:${NC}"
    echo -e "   kagami-status"
    echo -e "\n${YELLOW}4. View logs:${NC}"
    echo -e "   kagami-logs"
    echo -e "\n${YELLOW}Available commands:${NC}"
    echo -e "   kagami-start, kagami-stop, kagami-restart"
    echo -e "   kagami-status, kagami-logs, kagami-update"
    echo -e "   kagami-backup, kagami-db, kagami-config"
    echo -e "\n${GREEN}KagamiMe (鏡眼) is ready to serve as your digital sentinel!${NC}\n"
}

# Run main function
main "$@"
