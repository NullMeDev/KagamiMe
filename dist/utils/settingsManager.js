"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
class SettingsManager {
    constructor(database) {
        this.db = database;
        this.settings = {
            rss_enabled: true,
            digest_enabled: true,
            notifications_enabled: true,
            auto_update_enabled: true,
            fetch_interval: 30,
            digest_time: '09:00'
        };
    }
    async initialize() {
        await this.createSettingsTable();
        await this.loadSettings();
    }
    async createSettingsTable() {
        try {
            await this.db.run(`
                CREATE TABLE IF NOT EXISTS bot_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
        catch (error) {
            console.error('Error creating settings table:', error);
            throw error;
        }
    }
    async loadSettings() {
        try {
            const rows = await this.db.all('SELECT key, value FROM bot_settings');
            for (const row of rows) {
                if (row.key in this.settings) {
                    const value = row.value;
                    if (typeof this.settings[row.key] === 'boolean') {
                        this.settings[row.key] = value === 'true';
                    }
                    else if (typeof this.settings[row.key] === 'number') {
                        this.settings[row.key] = parseInt(value);
                    }
                    else {
                        this.settings[row.key] = value;
                    }
                }
            }
        }
        catch (error) {
            console.error('Error loading settings:', error);
            // Continue with default settings
        }
    }
    async setSetting(key, value) {
        try {
            const stringValue = String(value);
            await this.db.run('INSERT OR REPLACE INTO bot_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, stringValue]);
            this.settings[key] = value;
        }
        catch (error) {
            console.error(`Error setting ${key}:`, error);
            throw error;
        }
    }
    getSetting(key) {
        return this.settings[key];
    }
    getAllSettings() {
        return { ...this.settings };
    }
    async muteRSS() {
        await this.setSetting('rss_enabled', false);
    }
    async unmuteRSS() {
        await this.setSetting('rss_enabled', true);
    }
    async muteDigest() {
        await this.setSetting('digest_enabled', false);
    }
    async unmuteDigest() {
        await this.setSetting('digest_enabled', true);
    }
    async muteAll() {
        await this.setSetting('rss_enabled', false);
        await this.setSetting('digest_enabled', false);
        await this.setSetting('notifications_enabled', false);
    }
    async unmuteAll() {
        await this.setSetting('rss_enabled', true);
        await this.setSetting('digest_enabled', true);
        await this.setSetting('notifications_enabled', true);
    }
    isRSSEnabled() {
        return this.settings.rss_enabled;
    }
    isDigestEnabled() {
        return this.settings.digest_enabled;
    }
    isNotificationsEnabled() {
        return this.settings.notifications_enabled;
    }
}
exports.SettingsManager = SettingsManager;
//# sourceMappingURL=settingsManager.js.map