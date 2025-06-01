const { Database } = require('../dist/database');
const os = require('os');
require('dotenv').config();

class StatusUpdater {
    constructor() {
        this.db = new Database(process.env.DATABASE_PATH);
        this.lastUpdate = null;
        this.updateInterval = 60000; // 1 minute
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

    async getStatus() {
        await this.db.initialize();
        
        const feeds = await this.db.getActiveRSSFeeds();
        const events = await this.db.all(
            'SELECT event_type, event_data, timestamp FROM events ORDER BY timestamp DESC LIMIT 5'
        );
        const stats = await this.getSystemStats();
        const items = await this.db.all('SELECT COUNT(*) as count FROM rss_items');

        return {
            status: 'online',
            uptime: process.uptime(),
            rss: {
                activeFeeds: feeds.length,
                lastUpdate: this.lastUpdate || new Date().toISOString()
            },
            database: {
                connected: true,
                items: items[0].count
            },
            system: stats,
            tasks: {
                rssCheck: true,
                nextUpdate: new Date(Date.now() + 1800000).toISOString()
            },
            events: events.map(e => ({
                timestamp: e.timestamp,
                message: `${e.event_type}: ${e.event_data ? JSON.parse(e.event_data).message || '' : ''}`
            }))
        };
    }

    async updateCloudflare() {
        try {
            const status = await this.getStatus();
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/values/current_status`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(status)
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to update KV: ${response.status} ${response.statusText}`);
            }

            this.lastUpdate = new Date().toISOString();
            console.log(`Status updated successfully at ${this.lastUpdate}`);
        } catch (error) {
            console.error('Failed to update status:', error);
            await this.db.logEvent('status_update_error', { error: error.message });
        }
    }

    async start() {
        try {
            console.log('Starting status updater...');
            await this.updateCloudflare();
            setInterval(() => this.updateCloudflare(), this.updateInterval);
            
            // Log startup
            await this.db.logEvent('status_updater_start', { 
                interval: this.updateInterval,
                timestamp: new Date().toISOString()
            });
            
            console.log('Status updater running');
        } catch (error) {
            console.error('Error starting status updater:', error);
            process.exit(1);
        }
    }
}

// Start the updater
const updater = new StatusUpdater();
updater.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down status updater...');
    try {
        await updater.db.logEvent('status_updater_stop', { reason: 'SIGINT' });
        await updater.db.close();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
    process.exit(0);
});
