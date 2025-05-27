// Simple script to add government RSS sources
const Database = require('sqlite3').Database;
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'kagamime.db');
const db = new Database(dbPath);

const govSources = [
    {
        name: 'White House News',
        url: 'https://www.whitehouse.gov/feed/',
        category: 'government',
        active: 1,
        fetch_interval: 60
    },
    {
        name: 'CDC Newsroom',
        url: 'https://www.cdc.gov/media/rss/newsroom.xml',
        category: 'health',
        active: 1,
        fetch_interval: 180
    },
    {
        name: 'NASA News',
        url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
        category: 'science',
        active: 1,
        fetch_interval: 120
    }
];

async function addGovSources() {
    console.log('📡 Adding government RSS sources...');
    
    for (const source of govSources) {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT OR IGNORE INTO rss_feeds (name, url, category, active, fetch_interval, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [source.name, source.url, source.category, source.active, source.fetch_interval],
                function(err) {
                    if (err) {
                        console.error(`❌ Error adding ${source.name}:`, err.message);
                        reject(err);
                    } else {
                        console.log(`✅ Added: ${source.name} (ID: ${this.lastID || 'existing'})`);
                        resolve();
                    }
                }
            );
        });
    }
    
    // List all feeds
    console.log('\n📊 Current RSS feeds:');
    await new Promise((resolve, reject) => {
        db.all('SELECT * FROM rss_feeds ORDER BY created_at', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                rows.forEach((feed, index) => {
                    console.log(`${index + 1}. ${feed.name} (${feed.category}) - ${feed.active ? 'Active' : 'Inactive'}`);
                    console.log(`   URL: ${feed.url}`);
                    console.log(`   Interval: ${feed.fetch_interval} minutes\n`);
                });
                resolve();
            }
        });
    });
    
    db.close();
    console.log('✅ Government sources added successfully!');
}

addGovSources().catch(console.error);
