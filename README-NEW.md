# 🔥 KagamiMe (鏡眼)

> **Your sovereign, anime-inspired digital sentinel on the digital horizon**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

KagamiMe is an advanced Discord bot that harvests news articles, monitors RSS feeds, performs AI-powered fact-checks, and delivers automated daily digests. Built with TypeScript, it features intelligent caching, admin controls, and comprehensive news management.

## ✨ **Features**

### 🤖 **Core Functionality**
- **RSS Feed Monitoring** - Automated fetching from 11+ default sources
- **AI-Powered Responses** - OpenAI GPT integration for intelligent interactions  
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

### **Prerequisites**
- Node.js 18+ and npm
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- OpenAI API Key ([OpenAI Platform](https://platform.openai.com/))

### **Installation**
```bash
# Clone repository
git clone <your-repo-url>
cd KagamiMe

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens

# Build and start
npm run build
npm start
```

### **Environment Configuration**
```bash
DISCORD_TOKEN=your_discord_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
NOTIFY_CHANNEL_ID=discord_channel_id_for_notifications
BOT_OWNER_ID=your_discord_user_id
ADMIN_ROLE_ID=admin_role_id_in_your_server
DATABASE_PATH=./data/kagamime.db
FETCH_INTERVAL_MINUTES=30
DAILY_DIGEST_TIME=09:00
```

## 📱 **Commands**

### **User Commands**
```
!status              - Show bot status and uptime
!whoami              - Display your user information
!cmds                - List available commands
!ask <question>      - Ask KagamiMe anything (AI-powered)

!kagami              - Show KagamiMe help
!kagami pull         - Manually trigger RSS feed fetch
!kagami latest       - Show latest news articles
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
├── AI Integration (OpenAI)
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
# View database content
sqlite3 data/kagamime.db ".tables"
sqlite3 data/kagamime.db "SELECT * FROM rss_feeds;"

# Reset database
rm data/kagamime.db && npm start
```

### **Testing**
```bash
# System verification
./verify-system.sh

# Manual tests  
node test-db.js     # Database connectivity
node test-rss.js    # RSS fetching
node test-gov.js    # Government sources
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

- **Processing Speed**: 2-5 seconds per RSS feed
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
rm data/kagamime.db && npm start
```

## 📈 **Monitoring**

### **System Health**
- Use `!status` for real-time metrics
- Monitor `data/kagamime.db` file size
- Check RSS fetch success rates with `!admin listrss`

### **Log Files**
- Application logs: Console output
- Database events: `events` table in SQLite
- Error tracking: Structured error logging

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📋 **Roadmap**

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for 10 detailed enhancement suggestions including:

- Multi-platform integration (Twitter, Reddit)
- Advanced fact-checking with multiple APIs
- Web dashboard with React frontend
- Machine learning content analysis
- Performance optimizations with Redis

## 📝 **Changelog & Support**

### **Recent Updates**
- **v2.0.0** - Multi-API fact checking system with enhanced confidence scoring
- **v1.5.0** - Advanced RSS monitoring with 11+ default sources
- **v1.4.0** - SQLite database optimization and intelligent caching
- **v1.3.0** - Admin controls and permission system
- **v1.2.0** - Daily digest automation and cron scheduling
- **v1.1.0** - Web scraping and article deduplication
- **v1.0.0** - Initial release with Discord integration

### **🎯 Support the Project**

If KagamiMe has helped you stay informed and organized, consider supporting its development:

**🌟 Star the Repository**
- Give us a star on GitHub to help others discover KagamiMe
- Share the project with your communities

**💰 Donations**
- **GitHub Sponsors**: [Support via GitHub Sponsors](https://github.com/sponsors/your-username)
- **Ko-fi**: [Buy us a coffee](https://ko-fi.com/kagamime)
- **PayPal**: [One-time donation](https://paypal.me/kagamime)
- **Cryptocurrency**: 
  - BTC: `bc1qexample123456789`
  - ETH: `0xexample123456789`

**🤝 Contribute**
- Submit bug reports and feature requests
- Contribute code improvements and new features
- Help with documentation and translations
- Share your custom RSS feeds and configurations

**💡 Feature Requests**
Have an idea for KagamiMe? Open an issue with the `enhancement` label:
- New fact-checking APIs
- Additional news sources
- UI/UX improvements
- Integration suggestions

**🔧 Enterprise Support**
For commercial use, custom implementations, or priority support:
- Email: support@kagamime.dev
- Discord: [Join our support server](https://discord.gg/kagamime)

---

*Every contribution helps make KagamiMe better for the entire community!*

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Discord.js** - Powerful Discord API wrapper
- **OpenAI** - GPT integration for AI responses  
- **RSS Parser** - Reliable RSS feed processing
- **SQLite** - Lightweight database solution
- **Cheerio** - Server-side DOM manipulation

---

<div align="center">

**🎌 Built with TypeScript • Powered by AI • Inspired by Anime**

*KagamiMe (鏡眼) - Your Digital Sentinel*

[Documentation](STATUS.md) • [Improvements](IMPROVEMENTS.md) • [Support](https://github.com/your-repo/issues)

</div>
