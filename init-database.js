#!/usr/bin/env node
// Quick database initialization for KagamiMe
const Database = require('./dist/database.js').Database;

async function initializeDatabase() {
    console.log('🔥 Initializing KagamiMe database...');
    
    try {
        const db = new Database();
        await db.initialize();
        console.log('✅ Database tables created successfully!');
        
        // Add some basic RSS feeds for testing
        await db.run(`INSERT OR IGNORE INTO rss_feeds (url, name, category) VALUES 
            ('https://www.whitehouse.gov/feed/', 'White House News', 'government'),
            ('https://www.cdc.gov/rss/covid.xml', 'CDC COVID Updates', 'health'),
            ('https://www.nasa.gov/rss/dyn/breaking_news.rss', 'NASA Breaking News', 'science')`);
        
        console.log('✅ Default RSS feeds added!');
        console.log('🎌 KagamiMe database is ready for deployment!');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase();
