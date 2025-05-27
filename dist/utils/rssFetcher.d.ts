import { Database } from '../database';
export declare class RSSFetcher {
    private parser;
    private db;
    constructor(database: Database);
    fetchAllFeeds(): Promise<{
        success: number;
        errors: string[];
    }>;
    fetchSingleFeed(feedId: number, feedUrl: string, feedName: string): Promise<number>;
    getLatestItems(limit?: number): Promise<any[]>;
    getTopStories(limit?: number): Promise<any[]>;
    searchItems(query: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=rssFetcher.d.ts.map