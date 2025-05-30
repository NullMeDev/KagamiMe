import Parser from 'rss-parser';
import { Database } from '../database';

export class RSSFetcher {
    private parser: Parser;
    private db: Database;

    constructor(database: Database) {
        this.db = database;
        this.parser = new Parser({
            customFields: {
                item: ['content:encoded', 'dc:creator']
            }
        });
    }

    async fetchAllFeeds(): Promise<{ success: number; errors: string[] }> {
        console.log('🔄 Starting RSS feed fetch cycle...');
        const feeds = await this.db.getActiveRSSFeeds();
        const results = { success: 0, errors: [] as string[] };
        
        const now = new Date();
        
        for (const feed of feeds) {
            try {
                // Check if this feed is due for update based on its individual interval
                const shouldUpdate = await this.shouldUpdateFeed(feed);
                
                if (!shouldUpdate) {
                    console.log(`⏭️ Skipping ${feed.name}: Not due for update yet`);
                    continue;
                }
                
                await this.fetchSingleFeed(feed.id, feed.url, feed.name);
                results.success++;
                
                // Update last_fetched timestamp
                await this.db.updateFeedLastFetched(feed.id);
                
                console.log(`✅ Successfully fetched: ${feed.name}`);
            } catch (error) {
                const errorMsg = `Failed to fetch ${feed.name}: ${error instanceof Error ? error.message : String(error)}`;
                results.errors.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
                
                await this.db.logEvent('rss_fetch_error', {
                    feedId: feed.id,
                    feedName: feed.name,
                    error: errorMsg
                });
            }
        }

        await this.db.logEvent('rss_fetch_cycle', {
            totalFeeds: feeds.length,
            successful: results.success,
            errors: results.errors.length
        });

        console.log(`🏁 RSS fetch cycle complete: ${results.success}/${feeds.length} successful`);
        return results;
    }

    async fetchSingleFeed(feedId: number, feedUrl: string, feedName: string): Promise<number> {
        console.log(`📡 Fetching ${feedName}...`);
        
        try {
            const feed = await this.parser.parseURL(feedUrl);
            let newItemsCount = 0;

            if (!feed.items || feed.items.length === 0) {
                console.log(`⚠️ No items found in ${feedName}`);
                return 0;
            }

            for (const item of feed.items) {
                if (!item.link || !item.title) {
                    continue; // Skip items without required fields
                }

                // Check if item already exists
                const exists = await this.db.rssItemExists(item.link);
                if (exists) {
                    continue; // Skip duplicate items
                }

                // Parse publish date
                let publishedDate: Date | null = null;
                if (item.pubDate) {
                    publishedDate = new Date(item.pubDate);
                    if (isNaN(publishedDate.getTime())) {
                        publishedDate = null;
                    }
                }

                // Extract content (try multiple fields)
                let content = (item as any).content || item.contentSnippet || (item as any).description || '';
                
                // Extract author
                let author = (item as any)['dc:creator'] || (item as any).author || '';

                const rssItem = {
                    feedId,
                    title: item.title.trim(),
                    url: item.link.trim(),
                    description: item.contentSnippet || (item as any).description || '',
                    content: content.trim(),
                    author: author.trim(),
                    publishedDate,
                    guid: item.guid || item.link
                };

                await this.db.insertRSSItem(rssItem);
                newItemsCount++;
            }

            console.log(`📰 ${feedName}: ${newItemsCount} new items added`);
            return newItemsCount;

        } catch (error) {
            console.error(`❌ Error fetching ${feedName}:`, error);
            throw error;
        }
    }

    async getLatestItems(limit: number = 20): Promise<any[]> {
        return await this.db.getLatestRSSItems(limit);
    }

    async getTopStories(limit: number = 6): Promise<any[]> {
        // Get recent items from the last 24 hours, prioritizing general news
        return await this.db.getTopRSSItems(limit);
    }

    async searchItems(query: string, limit: number = 10): Promise<any[]> {
        return await this.db.searchRSSItems(query, limit);
    }

    // Helper method to determine if a feed should be updated based on its interval
    async shouldUpdateFeed(feed: any): Promise<boolean> {
        // If no last_fetched timestamp, it should be updated
        if (!feed.last_fetched) {
            return true;
        }
        
        const now = new Date();
        const lastFetched = new Date(feed.last_fetched);
        const intervalMinutes = feed.fetch_interval_minutes || 30;
        
        // Calculate time difference in milliseconds
        const diffMs = now.getTime() - lastFetched.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        
        // Return true if the elapsed time is greater than the interval
        return diffMinutes >= intervalMinutes;
    }

    // Test if an RSS feed is accessible and valid
    async testFeed(url: string): Promise<{ success: boolean; error?: string }> {
        try {
            const feed = await this.parser.parseURL(url);
            return { 
                success: true
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
            };
        }
    }

    // Identify and clean up dead RSS feeds
    async cleanDeadFeeds(maxFailures = 3, daysInactive = 7): Promise<{ cleaned: number; total: number }> {
        console.log('🧹 Starting RSS feed cleanup...');
        
        // Get all feeds including inactive ones
        const feeds = await this.db.all('SELECT * FROM rss_feeds');
        let cleaned = 0;
        
        for (const feed of feeds) {
            try {
                // Check last successful fetch
                const lastSuccess = feed.last_fetched ? new Date(feed.last_fetched) : null;
                const now = new Date();
                
                // Calculate days since last successful fetch
                const daysSinceLastFetch = lastSuccess ? 
                    Math.floor((now.getTime() - lastSuccess.getTime()) / (1000 * 60 * 60 * 24)) : 
                    daysInactive + 1; // If never fetched, treat as inactive
                
                // Get count of recent errors
                const errors = await this.db.all(
                    `SELECT COUNT(*) as count FROM events 
                     WHERE event_type = 'rss_fetch_error' 
                     AND event_data LIKE ? 
                     AND timestamp > datetime('now', '-7 days')`,
                    [`%"feedId":${feed.id}%`]
                );
                
                const errorCount = errors[0]?.count || 0;
                
                // Mark as dead if: too many errors OR inactive for too long
                if (errorCount >= maxFailures || daysSinceLastFetch >= daysInactive) {
                    console.log(`🚫 Marking feed as inactive: ${feed.name} (Errors: ${errorCount}, Days inactive: ${daysSinceLastFetch})`);
                    
                    // Test if the feed is actually accessible
                    const testResult = await this.testFeed(feed.url);
                    
                    if (!testResult.success) {
                        // Disable the feed
                        await this.db.toggleRSSFeed(feed.id, false);
                        cleaned++;
                        
                        await this.db.logEvent('rss_feed_disabled', {
                            feedId: feed.id,
                            feedName: feed.name,
                            reason: testResult.error || `Inactive for ${daysSinceLastFetch} days with ${errorCount} errors`
                        });
                    }
                }
            } catch (error) {
                console.error(`Error processing feed ${feed.name}:`, error);
            }
        }
        
        console.log(`🧹 RSS feed cleanup complete: ${cleaned}/${feeds.length} feeds disabled`);
        return { cleaned, total: feeds.length };
    }
}

