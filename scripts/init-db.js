#!/usr/bin/env node
/**
 * KagamiMe Database Migration System
 * 
 * This script manages database initialization and migrations.
 * It tracks applied migrations and only applies new ones.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Colored console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Logger with timestamps and colors
const log = {
  info: (message) => console.log(`${colors.cyan}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warn: (message) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  error: (message) => console.error(`${colors.red}[ERROR]${colors.reset} ${message}`)
};

// Migration files in order of application
const MIGRATIONS = [
  {
    version: '001',
    name: 'initial_schema',
    file: '../db/schema.sql'
  }
];

// Default seed data to insert after migrations
const SEEDS = [
  {
    name: 'default_rss_feeds',
    sql: `
      INSERT OR IGNORE INTO rss_feeds (name, url, category) VALUES
      ('BBC News', 'http://feeds.bbci.co.uk/news/rss.xml', 'general'),
      ('Reuters', 'http://feeds.reuters.com/reuters/topNews', 'general'),
      ('AP News', 'https://rsshub.app/apnews/topics/apf-topnews', 'general'),
      ('CNN', 'http://rss.cnn.com/rss/edition.rss', 'general'),
      ('NPR News', 'https://feeds.npr.org/1001/rss.xml', 'general'),
      ('TechCrunch', 'https://techcrunch.com/feed/', 'technology'),
      ('Ars Technica', 'http://feeds.arstechnica.com/arstechnica/index', 'technology'),
      ('Hacker News', 'https://hnrss.org/frontpage', 'technology'),
      ('White House News', 'https://www.whitehouse.gov/feed/', 'government'),
      ('CDC COVID Updates', 'https://www.cdc.gov/rss/covid.xml', 'health'),
      ('NASA Breaking News', 'https://www.nasa.gov/rss/dyn/breaking_news.rss', 'science');
    `
  }
];

/**
 * Database class to manage SQLite operations
 */
class DatabaseMigrator {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './data/kagamime.db';
    this.db = null;
    this.ensureDatabaseDirectory();
  }

  /**
   * Ensure the database directory exists
   */
  ensureDatabaseDirectory() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      log.info(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Connect to the database
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        log.info(`Connected to database at ${this.dbPath}`);
        resolve();
      });
    });
  }

  /**
   * Close the database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          log.info('Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Execute a SQL query
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this); // 'this' contains lastID, changes
      });
    });
  }

  /**
   * Query the database and return all results
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Get a single row from the database
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  /**
   * Execute SQL from a file
   */
  async executeSqlFile(filePath) {
    const fullPath = path.resolve(__dirname, filePath);
    log.info(`Executing SQL file: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`SQL file not found: ${fullPath}`);
    }
    
    const sql = fs.readFileSync(fullPath, 'utf8');
    return this.run(sql);
  }

  /**
   * Check if migrations table exists, create if it doesn't
   */
  async ensureMigrationsTable() {
    log.info('Ensuring migrations table exists...');
    
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      log.success('Migrations table is ready');
    } catch (err) {
      log.error(`Failed to create migrations table: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get a list of applied migrations
   */
  async getAppliedMigrations() {
    try {
      const rows = await this.all('SELECT version FROM migrations ORDER BY id');
      return rows.map(row => row.version);
    } catch (err) {
      // If table doesn't exist yet, return empty array
      if (err.message.includes('no such table')) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Record a migration as applied
   */
  async recordMigration(migration) {
    await this.run(
      'INSERT INTO migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.name]
    );
    log.success(`Recorded migration ${migration.version}: ${migration.name}`);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    log.info('Checking for pending migrations...');
    
    await this.ensureMigrationsTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Begin transaction
    await this.run('BEGIN TRANSACTION');
    
    try {
      let migrationCount = 0;
      
      for (const migration of MIGRATIONS) {
        if (!appliedMigrations.includes(migration.version)) {
          log.info(`Applying migration ${migration.version}: ${migration.name}`);
          
          await this.executeSqlFile(migration.file);
          await this.recordMigration(migration);
          
          migrationCount++;
        } else {
          log.info(`Migration ${migration.version} already applied, skipping`);
        }
      }
      
      // Commit transaction
      await this.run('COMMIT');
      
      if (migrationCount > 0) {
        log.success(`Applied ${migrationCount} migration(s)`);
      } else {
        log.info('No new migrations to apply');
      }
    } catch (err) {
      // Rollback transaction on error
      log.error(`Migration failed: ${err.message}`);
      await this.run('ROLLBACK');
      throw err;
    }
  }

  /**
   * Run seed data insertion
   */
  async runSeeds() {
    log.info('Running seed operations...');
    
    let seedCount = 0;
    
    try {
      for (const seed of SEEDS) {
        log.info(`Applying seed: ${seed.name}`);
        await this.run(seed.sql);
        seedCount++;
      }
      
      if (seedCount > 0) {
        log.success(`Applied ${seedCount} seed(s)`);
      } else {
        log.info('No seeds to apply');
      }
    } catch (err) {
      log.error(`Seed operation failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Run the entire migration and seeding process
   */
  async migrate() {
    try {
      log.info('🔥 Starting KagamiMe database migration process');
      
      await this.connect();
      await this.runMigrations();
      await this.runSeeds();
      
      log.success('🎌 KagamiMe database is ready for deployment!');
    } catch (err) {
      log.error(`Database migration failed: ${err.message}`);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run migrations when this script is executed directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.migrate();
}

module.exports = { DatabaseMigrator };

