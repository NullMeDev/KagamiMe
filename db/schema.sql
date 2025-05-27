-- KagamiMe Database Schema
-- SQLite3 database for storing events, articles, RSS feeds, and fact-checks

-- Events table for logging bot activities
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Articles table for storing news articles
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    content TEXT,
    summary TEXT,
    source TEXT,
    author TEXT,
    published_date DATETIME,
    scraped_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    category TEXT,
    relevance_score REAL DEFAULT 0.0,
    is_top_article BOOLEAN DEFAULT FALSE
);

-- RSS feeds table for managing RSS sources
CREATE TABLE IF NOT EXISTS rss_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_fetched DATETIME,
    fetch_interval_minutes INTEGER DEFAULT 30,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RSS items table for storing individual RSS feed items
CREATE TABLE IF NOT EXISTS rss_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    author TEXT,
    published_date DATETIME,
    guid TEXT,
    scraped_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
);

-- Fact checks table for storing AI-powered fact verification results
CREATE TABLE IF NOT EXISTS fact_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    rss_item_id INTEGER,
    url TEXT,
    claim TEXT NOT NULL,
    verdict TEXT NOT NULL, -- 'TRUE', 'FALSE', 'MIXED', 'UNVERIFIED'
    confidence_score REAL NOT NULL, -- 0.0 to 1.0
    explanation TEXT,
    sources TEXT, -- JSON array of source URLs
    ai_model TEXT,
    checked_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (rss_item_id) REFERENCES rss_items(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_published_date ON articles(published_date);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_relevance_score ON articles(relevance_score);
CREATE INDEX IF NOT EXISTS idx_rss_items_feed_id ON rss_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_items_published_date ON rss_items(published_date);
CREATE INDEX IF NOT EXISTS idx_fact_checks_verdict ON fact_checks(verdict);
CREATE INDEX IF NOT EXISTS idx_fact_checks_confidence ON fact_checks(confidence_score);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Insert default RSS feeds
INSERT OR IGNORE INTO rss_feeds (name, url, category) VALUES
('BBC News', 'http://feeds.bbci.co.uk/news/rss.xml', 'general'),
('Reuters', 'http://feeds.reuters.com/reuters/topNews', 'general'),
('AP News', 'https://rsshub.app/apnews/topics/apf-topnews', 'general'),
('CNN', 'http://rss.cnn.com/rss/edition.rss', 'general'),
('NPR News', 'https://feeds.npr.org/1001/rss.xml', 'general'),
('TechCrunch', 'https://techcrunch.com/feed/', 'technology'),
('Ars Technica', 'http://feeds.arstechnica.com/arstechnica/index', 'technology'),
('Hacker News', 'https://hnrss.org/frontpage', 'technology');

