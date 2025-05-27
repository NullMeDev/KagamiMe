// Add working .gov sources to database
const { Database } = require('./dist/database.js');
require('dotenv').config();

const workingGovSources = [
    {
        name: 'White House News',
        url: 'https://www.whitehouse.gov/feed/',
        category: 'government'
    },
    {
        name: 'NASA Breaking News',
        url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
        category: 'science'
    },
    {
        name: 'CDC Newsroom',
        url: 'https://tools.cdc.gov/api/v2/resources/media/316422.rss',
        category: 'health'
    }
];

async function addGovSources() {
    console.log('📡 Adding working .gov sources to database...');
    
    const db = new Database(process.env.DATABASE_PATH);
    await db.initialize();
    
    for (const source of workingGovSources) {
        try {
            const feedId = await db.addRSSFeed(source);
            console.log(`✅ Added: ${source.name} (ID: ${feedId})`);
        } catch (error) {
            console.log(`❌ Failed to add ${source.name}: ${error.message}`);
        }
    }
    
    await db.close();
    console.log('🏁 Government sources setup complete!');
}

addGovSources().catch(console.error);
