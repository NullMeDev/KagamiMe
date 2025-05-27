// Add working government RSS sources to KagamiMe database
const { Database } = require('./src/database');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'kagamime.db'));

const govSources = [
    {
        name: 'White House News',
        url: 'https://www.whitehouse.gov/feed/',
        category: 'government',
        active: true,
        fetch_interval: 60
    },
    {
        name: 'CDC Newsroom',
        url: 'https://www.cdc.gov/media/rss/newsroom.xml',
        category: 'health',
        active: true,
        fetch_interval: 180
    },
    {
        name: 'NASA News',
        url: 'https://www.nasa.gov/news/releases/latest/index.html',
        category: 'science',
        active: true,
        fetch_interval: 120
    },
    {
        name: 'FDA News',
        url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds-fda-news-information/rss-feed-fda-news-releases',
        category: 'health',
        active: true,
        fetch_interval: 240
    }
];

async function addGovSources() {
    try {
        await db.initialize();
        console.log('✅ Database initialized');

        for (const source of govSources) {
            try {
                const result = await db.run(
                    `INSERT INTO rss_feeds (name, url, category, active, fetch_interval, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [source.name, source.url, source.category, source.active ? 1 : 0, source.fetch_interval]
                );
                
                console.log(`✅ Added: ${source.name} (ID: ${result.lastID})`);
            } catch (error) {
                if (error.message.includes('UNIQUE constraint')) {
                    console.log(`⚠️  Already exists: ${source.name}`);
                } else {
                    console.error(`❌ Failed to add ${source.name}:`, error.message);
                }
            }
        }

        console.log('\n📊 Current RSS feeds:');
        const feeds = await db.all('SELECT * FROM rss_feeds ORDER BY created_at');
        feeds.forEach((feed, index) => {
            console.log(`${index + 1}. ${feed.name} (${feed.category}) - ${feed.active ? 'Active' : 'Inactive'}`);
            console.log(`   URL: ${feed.url}`);
            console.log(`   Interval: ${feed.fetch_interval} minutes\n`);
        });

        await db.close();
        console.log('✅ Government sources added successfully!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addGovSources();
