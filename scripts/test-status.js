const { Database } = require('../dist/database');
const os = require('os');

class StatusTester {
    constructor() {
        this.db = new Database(process.env.DATABASE_PATH);
    }

    async getSystemStats() {
        const loadavg = os.loadavg();
        const totalmem = os.totalmem();
        const freemem = os.freemem();
        const memoryUsage = ((totalmem - freemem) / totalmem) * 100;
        const cpuUsage = loadavg[0] * 100 / os.cpus().length;

        return {
            memoryUsage: Math.round(memoryUsage),
            cpuUsage: Math.round(cpuUsage)
        };
    }

    async runTests() {
        console.log('Testing status page components...\n');

        // Test database connection
        console.log('1. Testing database connection...');
        try {
            await this.db.initialize();
            console.log('✅ Database connection successful');
            
            // Test RSS feed status
            console.log('\n2. Testing RSS feed status...');
            const feeds = await this.db.getActiveRSSFeeds();
            console.log(`✅ Found ${feeds.length} active RSS feeds`);
            console.log('Feed list:');
            feeds.forEach(feed => {
                console.log(`   - ${feed.name} (${feed.url})`);
            });

            // Test system stats
            console.log('\n3. Testing system stats collection...');
            const stats = await this.getSystemStats();
            console.log('✅ System stats:', stats);

            // Test event logging
            console.log('\n4. Testing event logging...');
            await this.db.logEvent('test_event', { message: 'Status page test' });
            const events = await this.db.all('SELECT * FROM events ORDER BY timestamp DESC LIMIT 1');
            console.log('✅ Event logging successful:', events[0]);

            // Generate full status
            console.log('\n5. Testing status generation...');
            const status = {
                status: 'online',
                uptime: process.uptime(),
                rss: {
                    activeFeeds: feeds.length,
                    lastUpdate: new Date().toISOString()
                },
                database: {
                    connected: true,
                    items: (await this.db.all('SELECT COUNT(*) as count FROM rss_items'))[0].count
                },
                system: stats,
                tasks: {
                    rssCheck: true,
                    nextUpdate: new Date(Date.now() + 1800000).toISOString()
                },
                events: events.slice(0, 5).map(e => ({
                    timestamp: e.timestamp,
                    message: `${e.event_type}: ${e.event_data ? JSON.parse(e.event_data).message || '' : ''}`
                }))
            };
            console.log('✅ Status generated:', JSON.stringify(status, null, 2));

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.db.close();
        }

        console.log('\nTest complete!');
    }
}

// Run tests
const tester = new StatusTester();
tester.runTests().catch(console.error);
