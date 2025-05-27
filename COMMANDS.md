# 📋 KagamiMe (鏡眼) - Complete Command Reference

## 🎯 **USER COMMANDS** (Available to all users)

### Basic Commands
```bash
!status                          # Show bot status, uptime, and system info
!whoami                         # Display your Discord user information
!cmds                           # Show available commands list
!ask <question>                 # Ask KagamiMe AI any question
```

### News & RSS Commands
```bash
!kagami                         # Show KagamiMe command help
!kagami pull                    # Manually trigger RSS feed fetch
!kagami latest                  # Show latest news articles (top 10)
!kagami check <url>             # Fact-check an article (coming soon)
!kagami analyze <url>           # Deep analysis of content (coming soon)
```

---

## 🔧 **ADMIN COMMANDS** (Admin role required)

### RSS Feed Management
```bash
!admin addrss <name> <url> [category] [interval]    # Add new RSS feed
    Example: !admin addrss "Tech News" "https://example.com/rss" tech 60

!admin removerss <feed_id>                          # Remove RSS feed by ID
    Example: !admin removerss 5

!admin listrss                                      # List all RSS feeds with status
!admin togglerss <feed_id> <true|false>            # Enable/disable specific feed
    Example: !admin togglerss 3 false

!admin setinterval <feed_id> <minutes>              # Set fetch interval for feed
    Example: !admin setinterval 2 120
```

### Article Management
```bash
!admin addarticle <url>                             # Manually scrape and add article
!admin testdomain <domain>                          # Test if domain is accessible
    Example: !admin testdomain cnn.com
```

### Bot Control
```bash
!admin mute <rss|digest|all>                        # Mute specific features
    Examples: 
    !admin mute rss          # Stop RSS fetching
    !admin mute digest       # Stop daily digest
    !admin mute all          # Stop all automated features

!admin unmute <rss|digest|all>                      # Unmute features
    Examples:
    !admin unmute rss        # Resume RSS fetching
    !admin unmute digest     # Resume daily digest
    !admin unmute all        # Resume all features
```

---

## 🖥️ **SERVER COMMANDS** (Owner/Admin access)

### System Control (Owner Only)
```bash
!server restart                                     # Restart the entire bot
!server stop                                        # Stop the bot completely
!server start                                       # Start the bot (if stopped)
!server update                                      # Pull updates and restart
```

### Monitoring & Health (Admin Access)
```bash
!server status                                      # Complete server status report
!server health                                      # Run comprehensive health check
!server logs [lines] [type]                        # View system logs
    Examples:
    !server logs                 # Last 20 lines
    !server logs 50             # Last 50 lines
    !server logs 30 error       # Last 30 error lines
```

### Operations Control (Admin Access)
```bash
!server maintenance <on|off>                        # Toggle maintenance mode
!server pause [minutes]                             # Pause operations temporarily
    Example: !server pause 120  # Pause for 2 hours
!server resume                                      # Resume paused operations
!server backup                                      # Create system backup
```

---

## 🖥️ **SHELL ALIASES** (Server access required)

### Basic Control
```bash
kagami-start                    # Start KagamiMe service
kagami-stop                     # Stop KagamiMe service  
kagami-restart                  # Restart KagamiMe service
kagami-status                   # Check service status
```

### Monitoring & Logs
```bash
kagami-logs                     # Follow live logs
kagami-logs-error              # Show only error logs
```

### Maintenance
```bash
kagami-update                   # Update from git and restart
kagami-backup                   # Create backup archive
kagami-config                   # Edit configuration file
kagami-db                       # Access SQLite database directly
```

---

## ⚡ **AUTOMATED FEATURES**

### RSS Monitoring
- **Frequency**: Every 30 minutes (configurable)
- **Control**: Can be paused with `!admin mute rss`
- **Override**: Skips during maintenance mode

### Daily Digest
- **Schedule**: 9:00 AM daily (configurable in .env)
- **Content**: Top 6 news stories from last 24 hours
- **Control**: Can be disabled with `!admin mute digest`
- **Channel**: Posts to configured NOTIFY_CHANNEL_ID

### Maintenance Notifications
- **Auto-messages**: Polite notifications during restarts
- **Recovery**: Automatic "back online" messages
- **Status**: Real-time maintenance mode indicators

---

## 🔐 **PERMISSION LEVELS**

### 🌟 **Owner** (BOT_OWNER_ID)
- ✅ All user commands
- ✅ All admin commands  
- ✅ All server commands including restart/stop/start
- ✅ System updates and maintenance
- ✅ Shell access (if server access available)

### 🛡️ **Admin** (ADMIN_ROLE_ID)
- ✅ All user commands
- ✅ All admin commands (RSS, mute, etc.)
- ✅ Server monitoring (status, health, logs)
- ✅ Operations control (pause, resume, backup)
- ❌ System restart/stop/start (owner only)

### 👤 **Regular Users**
- ✅ Basic commands (status, whoami, cmds, ask)
- ✅ News commands (kagami latest, pull)
- ❌ Admin commands
- ❌ Server commands

---

## 🎨 **COMMAND EXAMPLES**

### Setting Up RSS Feeds
```bash
# Add major news sources
!admin addrss "BBC News" "http://feeds.bbci.co.uk/news/rss.xml" news 30
!admin addrss "Reuters Tech" "https://www.reuters.com/rssFeed/technologyNews" tech 60
!admin addrss "NASA News" "https://www.nasa.gov/rss/dyn/breaking_news.rss" science 120

# Check what was added
!admin listrss

# Disable a problematic feed
!admin togglerss 3 false
```

### Managing Bot Operations
```bash
# Temporary pause for maintenance
!server pause 60                # Pause for 1 hour
!admin mute rss                 # Stop RSS while debugging

# Resume normal operations  
!server resume
!admin unmute all

# Emergency restart
!server restart
```

### Monitoring and Troubleshooting
```bash
# Check overall health
!server health
!server status

# Review recent issues
!server logs 50 error

# Create backup before major changes
!server backup
```

---

## 🚨 **EMERGENCY PROCEDURES**

### Bot Not Responding
1. `!server status` - Check if bot is online
2. `kagami-status` - Check service status (shell access)
3. `kagami-restart` - Force restart (shell access)
4. `sudo systemctl status kagamime-bot` - System service check

### High Resource Usage
1. `!server health` - Check resource consumption
2. `!admin mute all` - Stop automated processes
3. `!server logs 100` - Review for error patterns
4. `kagami-restart` - Clean restart

### Database Issues
1. `!server backup` - Create backup first
2. `kagami-db .tables` - Check database integrity
3. `kagami-logs-error` - Review database errors
4. Contact system administrator if corruption detected

---

## 📞 **QUICK REFERENCE CARD**

| Action | User Command | Admin Command | Owner Command |
|--------|--------------|---------------|---------------|
| Get Status | `!status` | `!server status` | `!server health` |
| Latest News | `!kagami latest` | Same | Same |
| Stop RSS | ❌ | `!admin mute rss` | Same |
| Restart Bot | ❌ | ❌ | `!server restart` |
| View Logs | ❌ | `!server logs` | Same |
| Emergency Stop | ❌ | ❌ | `!server stop` |

**Remember**: KagamiMe (鏡眼) is your digital sentinel - treat her with respect! 🎌✨
