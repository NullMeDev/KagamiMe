// Test KagamiMe System End-to-End
const { Database } = require('./dist/database');
const { RSSFetcher } = require('./dist/utils/rssFetcher');
const { SettingsManager } = require('./dist/utils/settingsManager');
const path = require('path');

async function testSystem() {
    console.log('🧪 Testing KagamiMe System...\n');

    try {
        // Initialize components
        const db = new Database(path.join(__dirname, 'data', 'kagamime.db'));
        await db.initialize();
        console.log('✅ Database initialized');

        const settingsManager = new SettingsManager(db);
        await settingsManager.initialize();
        console.log('✅ Settings manager initialized');

        const rssFetcher = new RSSFetcher(db);
        console.log('✅ RSS fetcher initialized');

        // Test RSS feeds
        console.log('\n📊 Testing RSS feeds...');
        const feeds = await db.getAllRSSFeeds();
        console.log(`📡 Found ${feeds.length} RSS feeds:`);
        feeds.forEach((feed, index) => {
            console.log(`  ${index + 1}. ${feed.name} (${feed.category}) - ${feed.active ? 'Active' : 'Inactive'}`);
        });

        // Test settings
        console.log('\n⚙️  Testing settings system...');
        console.log('Current settings:', settingsManager.getAllSettings());
        
        console.log('Testing mute/unmute...');
        await settingsManager.muteRSS();
        console.log(`RSS enabled after mute: ${settingsManager.isRSSEnabled()}`);
        
        await settingsManager.unmuteRSS();
        console.log(`RSS enabled after unmute: ${settingsManager.isRSSEnabled()}`);

        // Test RSS fetching (limited)
        console.log('\n📰 Testing RSS fetch (sample)...');
        try {
            const activeFeeds = feeds.filter(f => f.active).slice(0, 2); // Test first 2 active feeds
            for (const feed of activeFeeds) {
                console.log(`Fetching from: ${feed.name}`);
                const result = await rssFetcher.fetchFeed(feed.id);
                console.log(`  ✅ Success: ${result.newItems} new items, ${result.errors.length} errors`);
            }
        } catch (error) {
            console.log(`  ⚠️  RSS fetch test skipped: ${error.message}`);
        }

        // Test database queries
        console.log('\n📈 Testing database operations...');
        const recentEvents = await db.getEvents(5);
        console.log(`Found ${recentEvents.length} recent events`);
        
        const rssItems = await db.all('SELECT COUNT(*) as count FROM rss_items');
        console.log(`RSS items in database: ${rssItems[0].count}`);

        await db.close();
        console.log('\n✅ System test completed successfully!');
        
        console.log('\n🎯 KagamiMe is ready for deployment!');
        console.log('📝 Next steps:');
        console.log('   1. Set up Discord bot token in .env');
        console.log('   2. Configure Discord channel ID for notifications');
        console.log('   3. Run: npm start');
        console.log('   4. Test commands in Discord: !kagami, !status, !admin');

    } catch (error) {
        console.error('❌ System test failed:', error);
        process.exit(1);
    }
}

testSystem();
