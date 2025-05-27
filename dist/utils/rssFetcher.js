"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSFetcher = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
class RSSFetcher {
    constructor(database) {
        this.db = database;
        this.parser = new rss_parser_1.default({
            customFields: {
                item: ['content:encoded', 'dc:creator']
            }
        });
    }
    async fetchAllFeeds() {
        console.log('🔄 Starting RSS feed fetch cycle...');
        const feeds = await this.db.getActiveRSSFeeds();
        const results = { success: 0, errors: [] };
        for (const feed of feeds) {
            try {
                await this.fetchSingleFeed(feed.id, feed.url, feed.name);
                results.success++;
                // Update last_fetched timestamp
                await this.db.updateFeedLastFetched(feed.id);
                console.log(`✅ Successfully fetched: ${feed.name}`);
            }
            catch (error) {
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
    async fetchSingleFeed(feedId, feedUrl, feedName) {
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
                let publishedDate = null;
                if (item.pubDate) {
                    publishedDate = new Date(item.pubDate);
                    if (isNaN(publishedDate.getTime())) {
                        publishedDate = null;
                    }
                }
                // Extract content (try multiple fields)
                let content = item.content || item.contentSnippet || item.description || '';
                // Extract author
                let author = item['dc:creator'] || item.author || '';
                const rssItem = {
                    feedId,
                    title: item.title.trim(),
                    url: item.link.trim(),
                    description: item.contentSnippet || item.description || '',
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
        }
        catch (error) {
            console.error(`❌ Error fetching ${feedName}:`, error);
            throw error;
        }
    }
    async getLatestItems(limit = 20) {
        return await this.db.getLatestRSSItems(limit);
    }
    async getTopStories(limit = 6) {
        // Get recent items from the last 24 hours, prioritizing general news
        return await this.db.getTopRSSItems(limit);
    }
    async searchItems(query, limit = 10) {
        return await this.db.searchRSSItems(query, limit);
    }
}
exports.RSSFetcher = RSSFetcher;
//# sourceMappingURL=rssFetcher.js.map