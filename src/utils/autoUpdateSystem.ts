// Auto-Update System for KagamiMe
// Handles version checking, updates, and Discord notifications
// Made with 💜 by NullMeDev

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { Database } from '../database.js';

const execAsync = promisify(exec);

export interface VersionInfo {
    version: string;
    build: string;
    release_date: string;
    changelog: { [version: string]: ChangelogEntry };
    update_check: UpdateConfig;
}

export interface ChangelogEntry {
    type: 'major' | 'minor' | 'patch' | 'hotfix';
    changes: string[];
    date: string;
}

export interface UpdateConfig {
    enabled: boolean;
    interval_hours: number;
    last_check: string | null;
    auto_update: boolean;
}

export class AutoUpdateSystem {
    private client: Client;
    private db: Database;
    private versionFile: string;
    private updateChannelId: string;
    private isUpdating: boolean = false;

    constructor(client: Client, database: Database) {
        this.client = client;
        this.db = database;
        this.versionFile = path.join(process.cwd(), 'version.json');
        this.updateChannelId = process.env.UPDATE_CHANNEL_ID || process.env.NOTIFY_CHANNEL_ID || '';
    }

    /**
     * Initialize the auto-update system
     */
    async initialize(): Promise<void> {
        try {
            // Ensure version file exists
            await this.ensureVersionFile();
            
            // Schedule periodic update checks
            const config = await this.getUpdateConfig();
            if (config.enabled) {
                this.scheduleUpdateChecks(config.interval_hours);
            }

            console.log('🔄 Auto-update system initialized');
        } catch (error) {
            console.error('Failed to initialize auto-update system:', error);
        }
    }

    /**
     * Schedule periodic update checks
     */
    private scheduleUpdateChecks(intervalHours: number): void {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        setInterval(async () => {
            try {
                await this.checkForUpdates();
            } catch (error) {
                console.error('Scheduled update check failed:', error);
            }
        }, intervalMs);

        console.log(`📅 Update checks scheduled every ${intervalHours} hours`);
    }

    /**
     * Check for available updates
     */
    async checkForUpdates(force: boolean = false): Promise<boolean> {
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
                } else {
                    await this.notifyUpdateAvailable();
                    return false;
                }
            } else {
                console.log('✅ KagamiMe is up to date');
                return false;
            }

        } catch (error) {
            console.error('Update check failed:', error);
            await this.notifyUpdateError(error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Perform the actual update process
     */
    async performUpdate(): Promise<void> {
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

        } catch (error) {
            console.error('Update failed:', error);
            await this.notifyUpdateError(error instanceof Error ? error.message : 'Unknown error');
            
            // Attempt to rollback
            try {
                await this.rollbackUpdate();
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Create a backup before updating
     */
    private async createBackup(): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `kagamime-backup-${timestamp}`;
        
        await execAsync(`sudo tar -czf /tmp/${backupName}.tar.gz -C /opt kagamime --exclude=node_modules --exclude=dist`);
        console.log(`💾 Backup created: /tmp/${backupName}.tar.gz`);
    }

    /**
     * Restart the KagamiMe service
     */
    private async restartService(): Promise<void> {
        await execAsync('sudo systemctl restart kagamime-bot');
    }

    /**
     * Wait for service to restart and come back online
     */
    private async waitForServiceRestart(): Promise<void> {
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
            } catch (error) {
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
    private async updateDatabase(): Promise<void> {
        try {
            // Run any pending database migrations
            await this.db.initialize();
            console.log('🗄️ Database schema updated');
        } catch (error) {
            console.warn('Database update warning:', error);
        }
    }

    /**
     * Rollback to previous version
     */
    private async rollbackUpdate(): Promise<void> {
        console.log('🔙 Attempting rollback...');
        await execAsync('git reset --hard HEAD~1');
        await execAsync('npm run build');
        await execAsync('sudo systemctl restart kagamime-bot');
        console.log('🔙 Rollback completed');
    }

    /**
     * Send Discord notification about update start
     */
    private async notifyUpdateStart(currentVersion: string): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle('🔄 KagamiMe Update Starting')
            .setDescription('Your digital sentinel is updating... Please wait warmly~ ✨')
            .addFields(
                { name: '📦 Current Version', value: currentVersion, inline: true },
                { name: '⏱️ Status', value: 'Downloading updates...', inline: true }
            )
            .setColor(0x9966CC)
            .setTimestamp()
            .setFooter({ text: 'Made with 💜 by NullMeDev' });

        await this.sendNotification(embed);
    }

    /**
     * Send Discord notification about successful update
     */
    private async notifyUpdateSuccess(oldVersion: string, newVersion: string, changelog: ChangelogEntry | null): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle('✅ KagamiMe Update Complete!')
            .setDescription('🎌 Your digital sentinel has been successfully updated! I appreciate your patience~ ✨')
            .addFields(
                { name: '📦 Version', value: `${oldVersion} → ${newVersion}`, inline: true },
                { name: '⏱️ Status', value: '🟢 Online & Ready', inline: true }
            )
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
    private async notifyUpdateAvailable(): Promise<void> {
        const embed = new EmbedBuilder()
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
    private async notifyUpdateError(error: string): Promise<void> {
        const embed = new EmbedBuilder()
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
    private async sendNotification(embed: EmbedBuilder): Promise<void> {
        try {
            if (!this.updateChannelId) {
                console.warn('No update channel configured');
                return;
            }

            const channel = this.client.channels.cache.get(this.updateChannelId) as TextChannel;
            if (channel && 'send' in channel) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
        }
    }

    /**
     * Get current version information
     */
    async getCurrentVersion(): Promise<VersionInfo> {
        const data = await fs.readFile(this.versionFile, 'utf-8');
        return JSON.parse(data);
    }

    /**
     * Get update configuration
     */
    private async getUpdateConfig(): Promise<UpdateConfig> {
        const version = await this.getCurrentVersion();
        return version.update_check;
    }

    /**
     * Update last check timestamp
     */
    private async updateLastCheckTime(): Promise<void> {
        const version = await this.getCurrentVersion();
        version.update_check.last_check = new Date().toISOString();
        await fs.writeFile(this.versionFile, JSON.stringify(version, null, 2));
    }

    /**
     * Get changelog for a specific version
     */
    private getChangelogForVersion(newVersion: VersionInfo, oldVersionString: string): ChangelogEntry | null {
        return newVersion.changelog[newVersion.version] || null;
    }

    /**
     * Ensure version file exists with default values
     */
    private async ensureVersionFile(): Promise<void> {
        try {
            await fs.access(this.versionFile);
        } catch (error) {
            // File doesn't exist, create it
            const defaultVersion: VersionInfo = {
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

            await fs.writeFile(this.versionFile, JSON.stringify(defaultVersion, null, 2));
            console.log('📝 Created version.json file');
        }
    }

    /**
     * Force update (for manual trigger)
     */
    async forceUpdate(): Promise<void> {
        await this.checkForUpdates(true);
    }

    /**
     * Get update status
     */
    getUpdateStatus(): { isUpdating: boolean; lastCheck: string | null } {
        return {
            isUpdating: this.isUpdating,
            lastCheck: null // Will be loaded from version file when needed
        };
    }
}
