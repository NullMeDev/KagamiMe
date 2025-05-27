import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

export class Database {
    private db: sqlite3.Database;
    private dbPath: string;

    constructor(dbPath: string = './data/noxhime.db') {
        this.dbPath = dbPath;
        
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
            }
        });
    }

    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const schemaPath = path.join(__dirname, '../../db/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error initializing database:', err);
                    reject(err);
                } else {
                    console.log('Database initialized successfully');
                    resolve();
                }
            });
        });
    }

    async logEvent(eventType: string, eventData?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const dataStr = eventData ? JSON.stringify(eventData) : null;
            this.db.run(
                'INSERT INTO events (event_type, event_data) VALUES (?, ?)',
                [eventType, dataStr],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getEvents(limit: number = 10): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM events ORDER BY timestamp DESC LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async addArticle(article: {
        title: string;
        url: string;
        content?: string;
        summary?: string;
        source?: string;
        author?: string;
        published_date?: Date;
        category?: string;
        relevance_score?: number;
    }): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO articles (title, url, content, summary, source, author, published_date, category, relevance_score)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    article.title,
                    article.url,
                    article.content,
                    article.summary,
                    article.source,
                    article.author,
                    article.published_date?.toISOString(),
                    article.category,
                    article.relevance_score || 0.0
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async addRSSItem(item: {
        feed_id: number;
        title: string;
        url: string;
        description?: string;
        content?: string;
        author?: string;
        published_date?: Date;
        guid?: string;
    }): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO rss_items (feed_id, title, url, description, content, author, published_date, guid)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.feed_id,
                    item.title,
                    item.url,
                    item.description,
                    item.content,
                    item.author,
                    item.published_date?.toISOString(),
                    item.guid
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getRSSFeeds(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM rss_feeds WHERE is_active = TRUE',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async updateFeedLastFetched(feedId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE rss_feeds SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?',
                [feedId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async addFactCheck(factCheck: {
        article_id?: number;
        rss_item_id?: number;
        url?: string;
        claim: string;
        verdict: string;
        confidence_score: number;
        explanation?: string;
        sources?: string[];
        ai_model?: string;
    }): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO fact_checks (article_id, rss_item_id, url, claim, verdict, confidence_score, explanation, sources, ai_model)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    factCheck.article_id,
                    factCheck.rss_item_id,
                    factCheck.url,
                    factCheck.claim,
                    factCheck.verdict,
                    factCheck.confidence_score,
                    factCheck.explanation,
                    factCheck.sources ? JSON.stringify(factCheck.sources) : null,
                    factCheck.ai_model
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getTopArticles(limit: number = 6): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM articles 
                 ORDER BY relevance_score DESC, published_date DESC 
                 LIMIT ?`,
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async close(): Promise<void> {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) console.error('Error closing database:', err);
                else console.log('Database connection closed');
                resolve();
            });
        });
    }
}

