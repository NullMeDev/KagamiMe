import { Database } from '../database';
export interface BotSettings {
    rss_enabled: boolean;
    digest_enabled: boolean;
    notifications_enabled: boolean;
    fetch_interval: number;
    digest_time: string;
}
export declare class SettingsManager {
    private db;
    private settings;
    constructor(database: Database);
    initialize(): Promise<void>;
    private createSettingsTable;
    private loadSettings;
    setSetting(key: keyof BotSettings, value: any): Promise<void>;
    getSetting(key: keyof BotSettings): any;
    getAllSettings(): BotSettings;
    muteRSS(): Promise<void>;
    unmuteRSS(): Promise<void>;
    muteDigest(): Promise<void>;
    unmuteDigest(): Promise<void>;
    muteAll(): Promise<void>;
    unmuteAll(): Promise<void>;
    isRSSEnabled(): boolean;
    isDigestEnabled(): boolean;
    isNotificationsEnabled(): boolean;
}
//# sourceMappingURL=settingsManager.d.ts.map