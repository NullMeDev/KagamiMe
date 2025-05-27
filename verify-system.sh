#!/bin/bash
# KagamiMe Final Verification Script
# This script performs a comprehensive system check

echo "🔥 KagamiMe (鏡眼) - Final System Verification"
echo "=============================================="
echo

# Check Node.js and npm
echo "📦 Checking Node.js environment..."
node --version
npm --version
echo

# Check project structure
echo "📁 Verifying project structure..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json missing"
    exit 1
fi

if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json found"
else
    echo "❌ tsconfig.json missing"
    exit 1
fi

if [ -d "src" ]; then
    echo "✅ src directory found"
else
    echo "❌ src directory missing"
    exit 1
fi

if [ -d "data" ]; then
    echo "✅ data directory found"
else
    echo "❌ data directory missing"
    exit 1
fi

if [ -f "data/kagamime.db" ]; then
    echo "✅ Database file found"
else
    echo "❌ Database file missing"
    exit 1
fi

echo

# Check dependencies
echo "📚 Checking dependencies..."
if npm list --depth=0 > /dev/null 2>&1; then
    echo "✅ All dependencies installed"
else
    echo "⚠️  Some dependencies may be missing, running npm install..."
    npm install
fi
echo

# Build project
echo "🔨 Building project..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi
echo

# Check database
echo "🗄️  Checking database..."
if sqlite3 data/kagamime.db ".tables" | grep -q "rss_feeds"; then
    echo "✅ Database tables exist"
    RSS_COUNT=$(sqlite3 data/kagamime.db "SELECT COUNT(*) FROM rss_feeds;")
    echo "📡 RSS feeds in database: $RSS_COUNT"
else
    echo "❌ Database tables missing"
    exit 1
fi
echo

# Test core modules
echo "🧪 Testing core modules..."
if node -e "require('./dist/database'); console.log('✅ Database module OK');" 2>/dev/null; then
    echo "✅ Database module loads successfully"
else
    echo "❌ Database module failed to load"
    exit 1
fi

if node -e "require('./dist/utils/rssFetcher'); console.log('✅ RSS fetcher module OK');" 2>/dev/null; then
    echo "✅ RSS fetcher module loads successfully"
else
    echo "❌ RSS fetcher module failed to load"
    exit 1
fi

if node -e "require('./dist/utils/settingsManager'); console.log('✅ Settings manager module OK');" 2>/dev/null; then
    echo "✅ Settings manager module loads successfully"
else
    echo "❌ Settings manager module failed to load"
    exit 1
fi
echo

# Check environment setup
echo "⚙️  Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    if grep -q "DISCORD_TOKEN" .env; then
        echo "✅ Discord token configured"
    else
        echo "⚠️  Discord token not configured in .env"
    fi
    if grep -q "OPENAI_API_KEY" .env; then
        echo "✅ OpenAI API key configured"
    else
        echo "⚠️  OpenAI API key not configured in .env"
    fi
else
    echo "⚠️  .env file not found - copy .env.example to .env and configure"
fi
echo

# Final system test
echo "🚀 Running final system test..."
node -e "
const { Database } = require('./dist/database');
const { SettingsManager } = require('./dist/utils/settingsManager');

async function finalTest() {
    try {
        const db = new Database('./data/kagamime.db');
        await db.initialize();
        
        const settings = new SettingsManager(db);
        await settings.initialize();
        
        const feeds = await db.getAllRSSFeeds();
        const events = await db.getEvents(5);
        
        console.log('📊 System Status:');
        console.log('  - RSS Feeds:', feeds.length);
        console.log('  - Recent Events:', events.length);
        console.log('  - RSS Enabled:', settings.isRSSEnabled());
        console.log('  - Digest Enabled:', settings.isDigestEnabled());
        
        await db.close();
        console.log('✅ All systems operational!');
    } catch (error) {
        console.error('❌ System test failed:', error.message);
        process.exit(1);
    }
}

finalTest();
"

echo
echo "🎯 KagamiMe Verification Complete!"
echo "=================================="
echo
echo "📋 Next Steps:"
echo "  1. Configure .env file with your Discord and OpenAI tokens"
echo "  2. Set up Discord bot permissions in your server"
echo "  3. Run: npm start"
echo "  4. Test with Discord commands: !status, !kagami, !admin"
echo
echo "📚 Documentation:"
echo "  - STATUS.md - Complete implementation status"
echo "  - IMPROVEMENTS.md - 10 enhancement suggestions"
echo "  - README.md - User guide and commands"
echo
echo "🎌 KagamiMe (鏡眼) is ready to serve as your digital sentinel!"
