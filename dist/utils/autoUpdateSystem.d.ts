import { Client } from 'discord.js';
import { Database } from '../database.js';
export interface VersionInfo {
    version: string;
    build: string;
    release_date: string;
    changelog: {
        [version: string]: ChangelogEntry;
    };
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
export declare class AutoUpdateSystem {
    private client;
    private db;
    private versionFile;
    private updateChannelId;
    private isUpdating;
    constructor(client: Client, database: Database);
    /**
     * Initialize the auto-update system
     */
    initialize(): Promise<void>;
    /**
     * Schedule periodic update checks
     */
    private scheduleUpdateChecks;
    /**
     * Check for available updates
     */
    checkForUpdates(force?: boolean): Promise<boolean>;
    /**
     * Perform the actual update process
     */
    performUpdate(): Promise<void>;
    /**
     * Create a backup before updating
     */
    private createBackup;
    /**
     * Restart the KagamiMe service
     */
    private restartService;
    /**
     * Wait for service to restart and come back online
     */
    private waitForServiceRestart;
    /**
     * Update database schema if needed
     */
    private updateDatabase;
    /**
     * Rollback to previous version
     */
    private rollbackUpdate;
    /**
     * Send Discord notification about update start
     */
    private notifyUpdateStart;
    /**
     * Send Discord notification about successful update
     */
    private notifyUpdateSuccess;
    /**
     * Send Discord notification about update availability
     */
    private notifyUpdateAvailable;
    /**
     * Send Discord notification about update error
     */
    private notifyUpdateError;
    /**
     * Send notification to Discord channel
     */
    private sendNotification;
    /**
     * Get current version information
     */
    getCurrentVersion(): Promise<VersionInfo>;
    /**
     * Get update configuration
     */
    private getUpdateConfig;
    /**
     * Update last check timestamp
     */
    private updateLastCheckTime;
    /**
     * Get changelog for a specific version
     */
    private getChangelogForVersion;
    /**
     * Ensure version file exists with default values
     */
    private ensureVersionFile;
    /**
     * Force update (for manual trigger)
     */
    forceUpdate(): Promise<void>;
    /**
     * Get update status
     */
    getUpdateStatus(): {
        isUpdating: boolean;
        lastCheck: string | null;
    };
}
//# sourceMappingURL=autoUpdateSystem.d.ts.map