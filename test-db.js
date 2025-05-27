const { Database } = require('./dist/database.js');
require('dotenv').config();

async function simpleTest() {
    console.log('🧪 Testing database connection...');
    const db = new Database(process.env.DATABASE_PATH);
    
    try {
        await db.initialize();
        console.log('✅ Database initialized');
        
        const feeds = await db.getActiveRSSFeeds();
        console.log('📡 Found', feeds.length, 'active RSS feeds');
        
        if (feeds.length > 0) {
            console.log('📋 First feed:', feeds[0].name, feeds[0].url);
        }
        
        // Test adding a fake RSS item
        const testItem = {
            feedId: 1,
            title: 'Test Article',
            url: 'https://example.com/test',
            description: 'Test description',
            content: 'Test content',
            author: 'Test Author',
            publishedDate: new Date(),
            guid: 'test-guid-123'
        };
        
        await db.insertRSSItem(testItem);
        console.log('✅ Test RSS item inserted');
        
        const items = await db.getLatestRSSItems(1);
        console.log('📰 Latest items count:', items.length);
        
        await db.close();
        console.log('🏁 Database test complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await db.close();
    }
}

simpleTest();
