// Test script for .gov sites and RSS feeds
const axios = require('axios');
const Parser = require('rss-parser');

const govSites = [
    'https://www.whitehouse.gov',
    'https://www.fbi.gov',
    'https://www.cdc.gov',
    'https://www.nasa.gov',
    'https://www.sec.gov',
    'https://www.treasury.gov',
    'https://www.defense.gov',
    'https://www.state.gov'
];

const govRSSFeeds = [
    { name: 'White House News', url: 'https://www.whitehouse.gov/feed/' },
    { name: 'NASA News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
    { name: 'CDC Newsroom', url: 'https://tools.cdc.gov/api/v2/resources/media/316422.rss' },
    { name: 'FBI Press Releases', url: 'https://www.fbi.gov/feeds/press-releases/press-releases.xml' },
    { name: 'SEC Press Releases', url: 'https://www.sec.gov/rss/press-release/press-release.xml' },
    { name: 'State Dept Press Releases', url: 'https://www.state.gov/rss-feeds/press-releases/' }
];

async function testGovSites() {
    console.log('🧪 Testing .gov sites for scraping accessibility...\n');
    
    for (const site of govSites) {
        try {
            const response = await axios.head(site, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; KagamiMe/1.0; +https://github.com/kagamime)'
                }
            });
            console.log(`✅ ${site} - Status: ${response.status}`);
        } catch (error) {
            console.log(`❌ ${site} - Error: ${error.message}`);
        }
    }
}

async function testGovRSSFeeds() {
    console.log('\n🧪 Testing .gov RSS feeds...\n');
    const parser = new Parser();
    
    for (const feed of govRSSFeeds) {
        try {
            const result = await parser.parseURL(feed.url);
            console.log(`✅ ${feed.name} - ${result.items?.length || 0} items`);
            if (result.items && result.items.length > 0) {
                console.log(`   Latest: ${result.items[0].title}`);
            }
        } catch (error) {
            console.log(`❌ ${feed.name} - Error: ${error.message}`);
        }
    }
}

async function runTests() {
    await testGovSites();
    await testGovRSSFeeds();
    console.log('\n🏁 Testing complete!');
}

runTests().catch(console.error);
