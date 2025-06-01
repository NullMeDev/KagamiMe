import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import cors from 'cors';

const execAsync = util.promisify(exec);

interface SystemStats {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: string;
    loadAverage: number[];
    temperature?: number;
    networkStatus: boolean;
}

interface StatusResponse {
    status: 'online' | 'offline' | 'degraded';
    stats: SystemStats;
    lastUpdated: string;
}

interface Event {
    description: string;
    timestamp: string;
    type: 'info' | 'warning' | 'error';
}

interface Incident {
    title: string;
    description: string;
    timestamp: string;
    resolved: boolean;
    resolution?: string;
}

const events: Event[] = [];
const incidents: Incident[] = [];
const MAX_EVENTS = 50;

async function collectSystemStats(): Promise<SystemStats> {
    try {
        // Get CPU usage
        const { stdout: cpuOut } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'");
        const cpuUsage = parseFloat(cpuOut.trim());

        // Get memory usage
        const { stdout: memOut } = await execAsync("free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2}'");
        const memoryUsage = parseFloat(memOut.trim());

        // Get disk usage
        const { stdout: diskOut } = await execAsync("df -h / | awk 'NR==2{print $5}' | sed 's/%//'");
        const diskUsage = parseFloat(diskOut.trim());

        // Get system uptime
        const { stdout: uptimeOut } = await execAsync("uptime -p");
        const uptime = uptimeOut.trim();

        // Get load average
        const { stdout: loadOut } = await execAsync("uptime | awk -F'load average:' '{print $2}'");
        const loadAverage = loadOut.trim().split(',').map(n => parseFloat(n));

        // Try to get CPU temperature
        let temperature: number | undefined;
        try {
            const { stdout: tempOut } = await execAsync("cat /sys/class/thermal/thermal_zone0/temp");
            temperature = parseFloat(tempOut.trim()) / 1000;
        } catch {
            // Temperature monitoring not available
        }

        // Check network connectivity
        const { stdout: pingOut } = await execAsync("ping -c 1 -W 5 8.8.8.8 || echo 'failed'");
        const networkStatus = !pingOut.includes('failed');

        return {
            cpuUsage,
            memoryUsage,
            diskUsage,
            uptime,
            loadAverage,
            temperature,
            networkStatus
        };
    } catch (error) {
        console.error('Error collecting system stats:', error);
        throw error;
    }
}

export function setupStatusApi(port = 3000) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Status endpoint
    app.get('/status', async (req, res) => {
        try {
            const stats = await collectSystemStats();
            
            // Determine overall status
            let status: StatusResponse['status'] = 'online';
            if (!stats.networkStatus || stats.cpuUsage > 90 || stats.memoryUsage > 90) {
                status = 'degraded';
            }

            const response: StatusResponse = {
                status,
                stats,
                lastUpdated: new Date().toISOString()
            };

            res.json(response);
        } catch (error) {
            console.error('Error in /status endpoint:', error);
            res.status(500).json({
                status: 'offline',
                error: 'Failed to collect system stats'
            });
        }
    });

    // Events endpoint
    app.get('/events', (req, res) => {
        res.json(events.slice(-10));  // Return last 10 events
    });

    // Incidents endpoint
    app.get('/incidents', (req, res) => {
        res.json(incidents.slice(-10));  // Return last 10 incidents
    });

    // Internal endpoint to add events
    app.post('/internal/events', (req, res) => {
        const { description, type = 'info' } = req.body;
        const event: Event = {
            description,
            type,
            timestamp: new Date().toISOString()
        };

        events.unshift(event);
        if (events.length > MAX_EVENTS) {
            events.pop();
        }

        res.json({ status: 'Event logged' });
    });

    // Internal endpoint to add incidents
    app.post('/internal/incidents', (req, res) => {
        const { title, description, resolved = false, resolution } = req.body;
        const incident: Incident = {
            title,
            description,
            resolved,
            resolution,
            timestamp: new Date().toISOString()
        };

        incidents.unshift(incident);
        if (incidents.length > MAX_EVENTS) {
            incidents.pop();
        }

        res.json({ status: 'Incident logged' });
    });

    return app.listen(port, () => {
        console.log(`Status API running on port ${port}`);
    });
}

// Export function to log events and incidents programmatically
export function logEvent(description: string, type: Event['type'] = 'info') {
    const event: Event = {
        description,
        type,
        timestamp: new Date().toISOString()
    };
    events.unshift(event);
    if (events.length > MAX_EVENTS) {
        events.pop();
    }
}

export function logIncident(
    title: string,
    description: string,
    resolved = false,
    resolution?: string
) {
    const incident: Incident = {
        title,
        description,
        resolved,
        resolution,
        timestamp: new Date().toISOString()
    };
    incidents.unshift(incident);
    if (incidents.length > MAX_EVENTS) {
        incidents.pop();
    }
}
