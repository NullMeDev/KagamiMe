import { Database } from '../database';

export interface BotSettings {
    rss_enabled: boolean;
    digest_enabled: boolean;
    notifications_enabled: boolean;
    fetch_interval: number;
    digest_time: string;
}

export class SettingsManager {
    private db: Database;
    private settings: BotSettings;

    constructor(database: Database) {
        this.db = database;
        this.settings = {
            rss_enabled: true,
            digest_enabled: true,
            notifications_enabled: true,
            fetch_interval: 30,
            digest_time: '09:00'
        };
    }

    async initialize(): Promise<void> {
        await this.createSettingsTable();
        await this.loadSettings();
    }

    private async createSettingsTable(): Promise<void> {
        try {
            await this.db.run(`
                CREATE TABLE IF NOT EXISTS bot_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (error) {
            console.error('Error creating settings table:', error);
            throw error;
        }
    }

    private async loadSettings(): Promise<void> {
        try {
            const rows = await this.db.all('SELECT key, value FROM bot_settings');
            
            for (const row of rows) {
                if (row.key in this.settings) {
                    const value = row.value;
                    if (typeof this.settings[row.key as keyof BotSettings] === 'boolean') {
                        (this.settings as any)[row.key] = value === 'true';
                    } else if (typeof this.settings[row.key as keyof BotSettings] === 'number') {
                        (this.settings as any)[row.key] = parseInt(value);
                    } else {
                        (this.settings as any)[row.key] = value;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            // Continue with default settings
        }
    }

    async setSetting(key: keyof BotSettings, value: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const stringValue = String(value);
            this.db.run(
                'INSERT OR REPLACE INTO bot_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [key, stringValue],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        (this.settings as any)[key] = value;
                        resolve();
                    }
                }
            );
        });
    }

    getSetting(key: keyof BotSettings): any {
        return this.settings[key];
    }

    getAllSettings(): BotSettings {
        return { ...this.settings };
    }

    async muteRSS(): Promise<void> {
        await this.setSetting('rss_enabled', false);
    }

    async unmuteRSS(): Promise<void> {
        await this.setSetting('rss_enabled', true);
    }

    async muteDigest(): Promise<void> {
        await this.setSetting('digest_enabled', false);
    }

    async unmuteDigest(): Promise<void> {
        await this.setSetting('digest_enabled', true);
    }

    async muteAll(): Promise<void> {
        await this.setSetting('rss_enabled', false);
        await this.setSetting('digest_enabled', false);
        await this.setSetting('notifications_enabled', false);
    }

    async unmuteAll(): Promise<void> {
        await this.setSetting('rss_enabled', true);
        await this.setSetting('digest_enabled', true);
        await this.setSetting('notifications_enabled', true);
    }

    isRSSEnabled(): boolean {
        return this.settings.rss_enabled;
    }

    isDigestEnabled(): boolean {
        return this.settings.digest_enabled;
    }

    isNotificationsEnabled(): boolean {
        return this.settings.notifications_enabled;
    }
}
