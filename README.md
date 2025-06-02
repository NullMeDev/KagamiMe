
# 🔥 KagamiMe (鏡眼)

> **Your sovereign, anime-inspired sentinel on the digital horizon**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

KagamiMe is an advanced Discord bot that harvests news articles, monitors RSS feeds, performs fact-checks using multiple verification services, and delivers automated daily digests. Built with TypeScript, it features intelligent caching, admin controls, and comprehensive news management.

## ✨ **Features**

### 🤖 **Core Functionality**
- **RSS Feed Monitoring** - Automated fetching from 11+ default sources
- **Multi-API Fact-Checking** - Cross-referenced verification using Google Fact Check and ClaimBuster
- **News Aggregation** - Smart article collection and deduplication
- **Daily Digests** - Automated morning news summaries
- **Web Scraping** - Article content extraction from any URL

### 🛡️ **Admin Controls**
- **Hot-Swap RSS Feeds** - Add/remove/toggle feeds without restart
- **Mute System** - Disable RSS/digest functions temporarily
- **Domain Testing** - Verify website accessibility for scraping
- **Manual Controls** - Force RSS pulls and article additions
- **Permission System** - Owner and admin role restrictions

### 📊 **Smart Management**
- **SQLite Database** - Efficient local storage with indexing
- **Cron Scheduling** - Configurable fetch intervals and digest timing
- **Error Handling** - Robust retry logic and graceful degradation
- **Event Logging** - Comprehensive activity tracking

## 🚀 **Quick Start**

### **System Requirements**
- **Operating System**: Ubuntu 24.04 (recommended)
- **Runtime**: Node.js 18.x
- **Database**: SQLite3
- **Tools**: Git, curl
- **Network**: Internet access for RSS fetching and API calls

### **Installation**

**Option 1: Quick Installation Script**
```bash
# Clone repository
git clone <your-repo-url>
cd KagamiMe

# Run the installation script (requires sudo)
sudo ./install.sh
```

**Option 2: Manual Installation**
```bash
# Clone repository
git clone <your-repo-url>
cd KagamiMe

# Install dependencies
npm ci

# Configure environment
cp .env.sample .env
# Edit .env with your tokens

# Build and start
npm run build
npm start
```

### **Environment Configuration**
```bash
# Required configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
DISCORD_CHANNEL_ID=discord_channel_id_for_notifications
OWNER_ID=your_discord_user_id
DATABASE_PATH=./data/kagamime.db

# Fact-checking APIs
GOOGLE_API_KEY=your_google_api_key_here
CLAIMBUSTER_API_KEY=your_claimbuster_api_key_here

# Optional configuration
FETCH_INTERVAL_MINUTES=30
DAILY_DIGEST_TIME=09:00
```

## 📱 **Commands**

### **User Commands**
```
!status              - Show bot status and uptime
!whoami              - Display your user information
!cmds                - List available commands

!kagami              - Show KagamiMe help
!kagami pull         - Manually trigger RSS feed fetch
!kagami latest       - Show latest news articles
!fact <claim>        - Fact-check a statement
!kagami check <claim> - Fact-check a statement
!kagami analyze <url> - Extract and verify claims from article
```

### **Admin Commands** *(Owner/Admin only)*
```
!admin               - Show admin command help

# RSS Management
!admin addrss <name> <url> [category] [interval]  - Add RSS feed
!admin removerss <id>                             - Remove RSS feed  
!admin listrss                                    - List all RSS feeds
!admin togglerss <id> <true|false>                - Enable/disable feed
!admin setinterval <id> <minutes>                 - Set fetch interval

# Content Management  
!admin addarticle <url>                           - Scrape and add article
!admin testdomain <domain>                        - Test domain accessibility

# System Controls
!admin mute <rss|digest|all>                      - Mute features
!admin unmute <rss|digest|all>                    - Unmute features
```

## 🏗️ **Architecture**

```
KagamiMe (鏡眼)
├── Discord Bot (discord.js)
├── Database (SQLite3)
│   ├── articles          - Scraped article content
│   ├── rss_feeds         - RSS source configuration  
│   ├── rss_items         - Fetched RSS entries
│   ├── fact_checks       - Verification results
│   ├── bot_settings      - System configuration
│   └── events            - Activity logging
├── RSS System (rss-parser)
├── Web Scraping (cheerio + axios)  
├── Fact-Checking (ClaimBuster + Google)
├── Cron Jobs (node-cron)
├── Admin System (RBAC)
└── Settings Management
```

## 📡 **Default RSS Sources**

KagamiMe comes pre-configured with reliable news sources:

**News & Politics**
- BBC News, Reuters, Associated Press, CNN, NPR

**Technology**  
- TechCrunch, Ars Technica, Hacker News

**Government (.gov)**
- White House News, CDC Newsroom, NASA News

*Add custom sources with `!admin addrss`*

## 🔧 **Advanced Configuration**

### **Custom RSS Feeds**
```bash
!admin addrss "Custom Source" "https://example.com/rss" "category" 60
```

### **Scheduling**
- **RSS Fetching**: Every 30 minutes (configurable)
- **Daily Digest**: 9:00 AM daily (configurable)
- **Cron Format**: Supports standard cron expressions

### **Mute Controls**
```bash
!admin mute rss      # Disable RSS fetching
!admin mute digest   # Disable daily digests  
!admin mute all      # Disable all automation
!admin unmute all    # Re-enable everything
```

## 🛠️ **Development**

### **Development Mode**
```bash
npm run dev          # Run with ts-node (auto-reload)
npm run build        # Compile TypeScript
npm start            # Run compiled version
```

### **Database Management**
```bash
# Initialize or migrate database
node scripts/init-db.js

# View database content
sqlite3 data/kagamime.db ".tables"
sqlite3 data/kagamime.db "SELECT * FROM rss_feeds;"
```

### **Testing**
```bash
# System verification
./verify-system.sh

# Manual tests  
node test-db.js     # Database connectivity
node test-rss.js    # RSS fetching
```

## 🐳 **Docker Deployment**

```bash
# Build image
docker build -t kagamime .

# Run container
docker-compose up -d

# View logs
docker-compose logs -f kagamime
```

## 🔒 **Security Features**

- **Role-Based Access** - Owner and admin permission levels
- **Input Sanitization** - SQL injection prevention
- **Rate Limiting** - API call throttling  
- **Secure Storage** - Environment variable token management
- **Error Isolation** - Prevents sensitive data exposure in logs

## 📊 **Performance**

- **Processing Speed**: 1-3 seconds per RSS feed
- **Memory Usage**: ~50-100MB RAM
- **Database Size**: <10MB typical usage  
- **Response Time**: <500ms for commands
- **Uptime Target**: 99.9%
- **Concurrent Feeds**: 100+ supported

## 🆘 **Troubleshooting**

### **Common Issues**

**Bot not responding**
```bash
# Check bot status
!status

# Verify token in .env
echo $DISCORD_TOKEN

# Check logs
docker-compose logs kagamime
```

**RSS feeds not updating**
```bash
# Manual trigger
!kagami pull

# Check mute status  
!admin
```

**Database errors**
```bash
# Verify database file
ls -la data/kagamime.db

# Reset if corrupted
rm data/kagamime.db && node scripts/init-db.js
```

## 📖 **Documentation**

Detailed documentation is available in the `docs/` directory:

- [Google API Setup](docs/google-api-setup.md)
- [Fact-Checker Status](docs/fact-checker-status.md)

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📋 **Roadmap**

See [IMPROVEMENTS-AND-REMOVALS.md](IMPROVEMENTS-AND-REMOVALS.md) for detailed enhancement suggestions including:

- Rule-based fact checking engine
- Federated RSS engine
- Web dashboard
- Multi-language support
- REST API for third-party integration

## 📝 **Changelog**

### **Recent Updates**
- **v2.2.0** - Removed OpenAI connectivity, simplified installation process
- **v2.1.0** - Multi-API fact checking system
- **v2.0.0** - Enhanced architecture, improved documentation, Ubuntu 24.04 support
- **v1.5.0** - Advanced RSS monitoring with 11+ default sources
- **v1.4.0** - SQLite database optimization and intelligent caching
- **v1.3.0** - Admin controls and permission system
- **v1.2.0** - Daily digest automation and cron scheduling
- **v1.1.0** - Web scraping and article deduplication
- **v1.0.0** - Initial release with Discord integration

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Discord.js** - Powerful Discord API wrapper
- **RSS Parser** - Reliable RSS feed processing
- **SQLite** - Lightweight database solution
- **Cheerio** - Server-side DOM manipulation
- **Google Fact Check Tools** - Fact verification API

<p align="center">
Contributions are welcome, either request here, or email me at null@nullme.dev! Please feel free to submit a pull request.
</p>
<p align="center">
Consider donating at https://ko-fi.com/NullMeDev
</p>
<p align="center">
Made With &#x1F49C by NullMeDev.</p>

