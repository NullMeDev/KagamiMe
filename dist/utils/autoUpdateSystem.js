"use strict";
// Auto-Update System for KagamiMe
// Handles version checking, updates, and Discord notifications
// Made with 💜 by NullMeDev
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoUpdateSystem = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const discord_js_1 = require("discord.js");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AutoUpdateSystem {
    constructor(client, database) {
        this.isUpdating = false;
        this.client = client;
        this.db = database;
        this.versionFile = path_1.default.join(process.cwd(), 'version.json');
        this.updateChannelId = process.env.UPDATE_CHANNEL_ID || process.env.NOTIFY_CHANNEL_ID || '';
    }
    /**
     * Initialize the auto-update system
     */
    async initialize() {
        try {
            // Ensure version file exists
            await this.ensureVersionFile();
            // Schedule periodic update checks
            const config = await this.getUpdateConfig();
            if (config.enabled) {
                this.scheduleUpdateChecks(config.interval_hours);
            }
            console.log('🔄 Auto-update system initialized');
        }
        catch (error) {
            console.error('Failed to initialize auto-update system:', error);
        }
    }
    /**
     * Schedule periodic update checks
     */
    scheduleUpdateChecks(intervalHours) {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        setInterval(async () => {
            try {
                await this.checkForUpdates();
            }
            catch (error) {
                console.error('Scheduled update check failed:', error);
            }
        }, intervalMs);
        console.log(`📅 Update checks scheduled every ${intervalHours} hours`);
    }
    /**
     * Check for available updates
     */
    async checkForUpdates(force = false) {
        try {
            if (this.isUpdating) {
                console.log('⏳ Update already in progress, skipping check');
                return false;
            }
            const config = await this.getUpdateConfig();
            if (!config.enabled && !force) {
                console.log('🔒 Auto-updates disabled');
                return false;
            }
            console.log('🔍 Checking for updates...');
            // Update last check timestamp
            await this.updateLastCheckTime();
            // Fetch latest from remote
            await execAsync('git fetch origin main');
            // Check if we're behind
            const { stdout: statusOutput } = await execAsync('git status -uno');
            const isBehind = statusOutput.includes('behind');
            if (isBehind || force) {
                console.log('📦 Updates available!');
                if (config.auto_update || force) {
                    await this.performUpdate();
                    return true;
                }
                else {
                    await this.notifyUpdateAvailable();
                    return false;
                }
            }
            else {
                console.log('✅ KagamiMe is up to date');
                return false;
            }
        }
        catch (error) {
            console.error('Update check failed:', error);
            await this.notifyUpdateError(error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    /**
     * Perform the actual update process
     */
    async performUpdate() {
        if (this.isUpdating) {
            console.log('⏳ Update already in progress');
            return;
        }
        this.isUpdating = true;
        try {
            const currentVersion = await this.getCurrentVersion();
            console.log(`🔄 Starting update from version ${currentVersion.version}`);
            // Notify Discord about update start
            await this.notifyUpdateStart(currentVersion.version);
            // Create backup
            await this.createBackup();
            // Pull latest changes
            console.log('📥 Pulling latest changes...');
            const { stdout: gitOutput } = await execAsync('git pull origin main');
            // Check what changed
            const newVersion = await this.getCurrentVersion();
            const changelog = this.getChangelogForVersion(newVersion, currentVersion.version);
            // Install dependencies if package.json changed
            if (gitOutput.includes('package.json') || gitOutput.includes('package-lock.json')) {
                console.log('📦 Installing updated dependencies...');
                await execAsync('npm install --production');
            }
            // Build TypeScript
            console.log('🔨 Building updated code...');
            await execAsync('npm run build');
            // Update database schema if needed
            await this.updateDatabase();
            // Restart the service
            console.log('🔄 Restarting service...');
            await this.restartService();
            // Wait for service to come back online
            await this.waitForServiceRestart();
            // Notify success
            await this.notifyUpdateSuccess(currentVersion.version, newVersion.version, changelog);
            console.log(`✅ Update completed: ${currentVersion.version} → ${newVersion.version}`);
        }
        catch (error) {
            console.error('Update failed:', error);
            await this.notifyUpdateError(error instanceof Error ? error.message : 'Unknown error');
            // Attempt to rollback
            try {
                await this.rollbackUpdate();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }
        finally {
            this.isUpdating = false;
        }
    }
    /**
     * Create a backup before updating
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `kagamime-backup-${timestamp}`;
        await execAsync(`sudo tar -czf /tmp/${backupName}.tar.gz -C /opt kagamime --exclude=node_modules --exclude=dist`);
        console.log(`💾 Backup created: /tmp/${backupName}.tar.gz`);
    }
    /**
     * Restart the KagamiMe service
     */
    async restartService() {
        await execAsync('sudo systemctl restart kagamime-bot');
    }
    /**
     * Wait for service to restart and come back online
     */
    async waitForServiceRestart() {
        const maxWaitTime = 60000; // 60 seconds
        const checkInterval = 2000; // 2 seconds
        let elapsed = 0;
        while (elapsed < maxWaitTime) {
            try {
                const { stdout } = await execAsync('sudo systemctl is-active kagamime-bot');
                if (stdout.trim() === 'active') {
                    console.log('✅ Service restarted successfully');
                    return;
                }
            }
            catch (error) {
                // Service not ready yet
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
        }
        throw new Error('Service failed to restart within timeout period');
    }
    /**
     * Update database schema if needed
     */
    async updateDatabase() {
        try {
            // Run any pending database migrations
            await this.db.initialize();
            console.log('🗄️ Database schema updated');
        }
        catch (error) {
            console.warn('Database update warning:', error);
        }
    }
    /**
     * Rollback to previous version
     */
    async rollbackUpdate() {
        console.log('🔙 Attempting rollback...');
        await execAsync('git reset --hard HEAD~1');
        await execAsync('npm run build');
        await execAsync('sudo systemctl restart kagamime-bot');
        console.log('🔙 Rollback completed');
    }
    /**
     * Send Discord notification about update start
     */
    async notifyUpdateStart(currentVersion) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🔄 KagamiMe Update Starting')
            .setDescription('Your digital sentinel is updating... Please wait warmly~ ✨')
            .addFields({ name: '📦 Current Version', value: currentVersion, inline: true }, { name: '⏱️ Status', value: 'Downloading updates...', inline: true })
            .setColor(0x9966CC)
            .setTimestamp()
            .setFooter({ text: 'Made with 💜 by NullMeDev' });
        await this.sendNotification(embed);
    }
    /**
     * Send Discord notification about successful update
     */
    async notifyUpdateSuccess(oldVersion, newVersion, changelog) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('✅ KagamiMe Update Complete!')
            .setDescription('🎌 Your digital sentinel has been successfully updated! I appreciate your patience~ ✨')
            .addFields({ name: '📦 Version', value: `${oldVersion} → ${newVersion}`, inline: true }, { name: '⏱️ Status', value: '🟢 Online & Ready', inline: true })
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: 'Made with 💜 by NullMeDev' });
        if (changelog) {
            const changeType = changelog.type.toUpperCase();
            const changeIcon = changelog.type === 'major' ? '🎯' :
                changelog.type === 'minor' ? '✨' :
                    changelog.type === 'patch' ? '🔧' : '🚑';
            embed.addFields({
                name: `${changeIcon} ${changeType} Update`,
                value: changelog.changes.map(change => `• ${change}`).join('\n').substring(0, 1024),
                inline: false
            });
        }
        await this.sendNotification(embed);
    }
    /**
     * Send Discord notification about update availability
     */
    async notifyUpdateAvailable() {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('📦 Update Available')
            .setDescription('A new version of KagamiMe is available! Use `!server update` to install.')
            .setColor(0xFFAA00)
            .setTimestamp()
            .setFooter({ text: 'Made with 💜 by NullMeDev' });
        await this.sendNotification(embed);
    }
    /**
     * Send Discord notification about update error
     */
    async notifyUpdateError(error) {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('❌ Update Failed')
            .setDescription('An error occurred during the update process. Please check logs.')
            .addFields({ name: '🚨 Error', value: error.substring(0, 1024), inline: false })
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Made with 💜 by NullMeDev' });
        await this.sendNotification(embed);
    }
    /**
     * Send notification to Discord channel
     */
    async sendNotification(embed) {
        try {
            if (!this.updateChannelId) {
                console.warn('No update channel configured');
                return;
            }
            const channel = this.client.channels.cache.get(this.updateChannelId);
            if (channel && 'send' in channel) {
                await channel.send({ embeds: [embed] });
            }
        }
        catch (error) {
            console.error('Failed to send Discord notification:', error);
        }
    }
    /**
     * Get current version information
     */
    async getCurrentVersion() {
        const data = await promises_1.default.readFile(this.versionFile, 'utf-8');
        return JSON.parse(data);
    }
    /**
     * Get update configuration
     */
    async getUpdateConfig() {
        const version = await this.getCurrentVersion();
        return version.update_check;
    }
    /**
     * Update last check timestamp
     */
    async updateLastCheckTime() {
        const version = await this.getCurrentVersion();
        version.update_check.last_check = new Date().toISOString();
        await promises_1.default.writeFile(this.versionFile, JSON.stringify(version, null, 2));
    }
    /**
     * Get changelog for a specific version
     */
    getChangelogForVersion(newVersion, oldVersionString) {
        return newVersion.changelog[newVersion.version] || null;
    }
    /**
     * Ensure version file exists with default values
     */
    async ensureVersionFile() {
        try {
            await promises_1.default.access(this.versionFile);
        }
        catch (error) {
            // File doesn't exist, create it
            const defaultVersion = {
                version: "0.4.2",
                build: "2024052801",
                release_date: "2024-05-28",
                changelog: {
                    "0.4.2": {
                        type: "major",
                        changes: [
                            "Multi-API fact-checking integration",
                            "Auto-update system implementation",
                            "Version tracking system",
                            "Enhanced Discord notifications"
                        ],
                        date: "2024-05-28"
                    }
                },
                update_check: {
                    enabled: true,
                    interval_hours: 6,
                    last_check: null,
                    auto_update: true
                }
            };
            await promises_1.default.writeFile(this.versionFile, JSON.stringify(defaultVersion, null, 2));
            console.log('📝 Created version.json file');
        }
    }
    /**
     * Force update (for manual trigger)
     */
    async forceUpdate() {
        await this.checkForUpdates(true);
    }
    /**
     * Get update status
     */
    getUpdateStatus() {
        return {
            isUpdating: this.isUpdating,
            lastCheck: null // Will be loaded from version file when needed
        };
    }
}
exports.AutoUpdateSystem = AutoUpdateSystem;
//# sourceMappingURL=autoUpdateSystem.js.map