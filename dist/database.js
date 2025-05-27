"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Database {
    constructor(dbPath = './data/noxhime.db') {
        this.dbPath = dbPath;
        // Ensure data directory exists
        const dataDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        this.db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            }
            else {
                console.log('Connected to SQLite database');
            }
        });
    }
    async initialize() {
        return new Promise((resolve, reject) => {
            const schemaPath = path_1.default.join(__dirname, '../db/schema.sql');
            const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error initializing database:', err);
                    reject(err);
                }
                else {
                    console.log('Database initialized successfully');
                    resolve();
                }
            });
        });
    }
    async logEvent(eventType, eventData) {
        return new Promise((resolve, reject) => {
            const dataStr = eventData ? JSON.stringify(eventData) : null;
            this.db.run('INSERT INTO events (event_type, event_data) VALUES (?, ?)', [eventType, dataStr], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async getEvents(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async addArticle(article) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO articles (title, url, content, summary, source, author, published_date, category, relevance_score)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                article.title,
                article.url,
                article.content,
                article.summary,
                article.source,
                article.author,
                article.published_date?.toISOString(),
                article.category,
                article.relevance_score || 0.0
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
        });
    }
    async addRSSItem(item) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR IGNORE INTO rss_items (feed_id, title, url, description, content, author, published_date, guid)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                item.feed_id,
                item.title,
                item.url,
                item.description,
                item.content,
                item.author,
                item.published_date?.toISOString(),
                item.guid
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
        });
    }
    async getRSSFeeds() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM rss_feeds WHERE is_active = TRUE', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async updateFeedLastFetched(feedId) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE rss_feeds SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?', [feedId], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async addFactCheck(factCheck) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO fact_checks (article_id, rss_item_id, url, claim, verdict, confidence_score, explanation, sources, ai_model)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                factCheck.article_id,
                factCheck.rss_item_id,
                factCheck.url,
                factCheck.claim,
                factCheck.verdict,
                factCheck.confidence_score,
                factCheck.explanation,
                factCheck.sources ? JSON.stringify(factCheck.sources) : null,
                factCheck.ai_model
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
        });
    }
    async getTopArticles(limit = 6) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM articles 
                 ORDER BY relevance_score DESC, published_date DESC 
                 LIMIT ?`, [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async getActiveRSSFeeds() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM rss_feeds WHERE is_active = TRUE ORDER BY name', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async rssItemExists(url) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id FROM rss_items WHERE url = ?', [url], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(!!row);
            });
        });
    }
    async insertRSSItem(item) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR IGNORE INTO rss_items (feed_id, title, url, description, content, author, published_date, guid)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                item.feedId,
                item.title,
                item.url,
                item.description,
                item.content,
                item.author,
                item.publishedDate?.toISOString(),
                item.guid
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
        });
    }
    async getLatestRSSItems(limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT ri.*, rf.name as feed_name, rf.category 
                 FROM rss_items ri 
                 JOIN rss_feeds rf ON ri.feed_id = rf.id 
                 ORDER BY ri.published_date DESC, ri.scraped_date DESC 
                 LIMIT ?`, [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async getTopRSSItems(limit = 6) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT ri.*, rf.name as feed_name, rf.category 
                 FROM rss_items ri 
                 JOIN rss_feeds rf ON ri.feed_id = rf.id 
                 WHERE ri.published_date >= datetime('now', '-24 hours')
                 ORDER BY 
                   CASE WHEN rf.category = 'general' THEN 1 ELSE 2 END,
                   ri.published_date DESC 
                 LIMIT ?`, [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async searchRSSItems(query, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT ri.*, rf.name as feed_name, rf.category 
                 FROM rss_items ri 
                 JOIN rss_feeds rf ON ri.feed_id = rf.id 
                 WHERE ri.title LIKE ? OR ri.description LIKE ? OR ri.content LIKE ?
                 ORDER BY ri.published_date DESC 
                 LIMIT ?`, [`%${query}%`, `%${query}%`, `%${query}%`, limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err)
                    console.error('Error closing database:', err);
                else
                    console.log('Database connection closed');
                resolve();
            });
        });
    }
    async articleExists(url) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id FROM articles WHERE url = ?', [url], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(!!row);
            });
        });
    }
    async addRSSFeed(feedData) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO rss_feeds (name, url, category, fetch_interval_minutes, is_active)
                 VALUES (?, ?, ?, ?, TRUE)`, [
                feedData.name,
                feedData.url,
                feedData.category || 'general',
                feedData.fetchInterval || 30
            ], function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
        });
    }
    async removeRSSFeed(feedId) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM rss_feeds WHERE id = ?', [feedId], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async toggleRSSFeed(feedId, isActive) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE rss_feeds SET is_active = ? WHERE id = ?', [isActive, feedId], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async getAllRSSFeeds() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM rss_feeds ORDER BY name', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async updateRSSFeedInterval(feedId, intervalMinutes) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE rss_feeds SET fetch_interval_minutes = ? WHERE id = ?', [intervalMinutes, feedId], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    // Generic database methods for settings and other uses
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map