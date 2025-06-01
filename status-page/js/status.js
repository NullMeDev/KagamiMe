// Constants
const API_ENDPOINT = 'https://api.nullme.lol/kagamime/status';
const UPDATE_INTERVAL = 30000; // 30 seconds

// Status Elements
const elements = {
    botStatus: document.getElementById('botStatus'),
    uptime: document.getElementById('uptime'),
    activeFeeds: document.getElementById('activeFeeds'),
    lastUpdate: document.getElementById('lastUpdate'),
    dbConnectionStatus: document.getElementById('dbConnectionStatus'),
    dbItems: document.getElementById('dbItems'),
    memoryUsage: document.getElementById('memoryUsage'),
    cpuUsage: document.getElementById('cpuUsage'),
    rssCheckStatus: document.getElementById('rssCheckStatus'),
    nextUpdate: document.getElementById('nextUpdate'),
    eventsList: document.getElementById('eventsList'),
    lastChecked: document.getElementById('lastChecked')
};

// Helper Functions
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function updateStatus(status) {
    // Update Bot Status
    const statusDot = elements.botStatus.querySelector('.status-dot');
    const statusText = elements.botStatus.querySelector('.status-text');
    
    statusDot.className = 'status-dot ' + status.status;
    statusText.textContent = status.status.charAt(0).toUpperCase() + status.status.slice(1);
    elements.uptime.textContent = `Uptime: ${formatUptime(status.uptime)}`;

    // Update RSS Status
    elements.activeFeeds.textContent = status.rss.activeFeeds;
    elements.lastUpdate.textContent = formatTimestamp(status.rss.lastUpdate);

    // Update Database Status
    elements.dbConnectionStatus.textContent = status.database.connected ? 'Connected' : 'Disconnected';
    elements.dbItems.textContent = status.database.items;

    // Update System Status
    elements.memoryUsage.textContent = `${status.system.memoryUsage}%`;
    elements.cpuUsage.textContent = `${status.system.cpuUsage}%`;

    // Update Tasks Status
    elements.rssCheckStatus.textContent = status.tasks.rssCheck ? 'Active' : 'Inactive';
    elements.nextUpdate.textContent = formatTimestamp(status.tasks.nextUpdate);

    // Update Events List
    elements.eventsList.innerHTML = status.events
        .map(event => `<p><strong>${formatTimestamp(event.timestamp)}</strong>: ${event.message}</p>`)
        .join('');

    // Update Last Checked
    elements.lastChecked.textContent = new Date().toLocaleString();
}

// Fetch Status
async function fetchStatus() {
    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateStatus(data);
    } catch (error) {
        console.error('Error fetching status:', error);
        // Update UI to show error state
        const statusDot = elements.botStatus.querySelector('.status-dot');
        const statusText = elements.botStatus.querySelector('.status-text');
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Error';
    }
}

// Initialize
fetchStatus();
setInterval(fetchStatus, UPDATE_INTERVAL);
