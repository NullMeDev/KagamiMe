const { Database } = require('./dist/database.js');
const { RSSFetcher } = require('./dist/utils/rssFetcher.js');
require('dotenv').config();

async function testRSS() {
    const db = new Database(process.env.DATABASE_PATH);
    await db.initialize();
    
    const rssFetcher = new RSSFetcher(db);
    console.log('🧪 Testing RSS fetch for BBC News...');
    
    try {
        const feeds = await db.getActiveRSSFeeds();
        if (feeds.length > 0) {
            const bbcFeed = feeds.find(f => f.name === 'BBC News') || feeds[0];
            console.log('📡 Testing feed:', bbcFeed.name, ':', bbcFeed.url);
            const result = await rssFetcher.fetchSingleFeed(bbcFeed.id, bbcFeed.url, bbcFeed.name);
            console.log('✅ New items added:', result);
            
            // Check how many items we now have
            const items = await rssFetcher.getLatestItems(5);
            console.log('📰 Latest items count:', items.length);
            if (items.length > 0) {
                console.log('📋 Sample item:', items[0].title);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    await db.close();
    console.log('🏁 Test complete');
}

testRSS();
