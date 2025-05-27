export declare class Database {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    logEvent(eventType: string, eventData?: any): Promise<void>;
    getEvents(limit?: number): Promise<any[]>;
    addArticle(article: {
        title: string;
        url: string;
        content?: string;
        summary?: string;
        source?: string;
        author?: string;
        published_date?: Date;
        category?: string;
        relevance_score?: number;
    }): Promise<number>;
    addRSSItem(item: {
        feed_id: number;
        title: string;
        url: string;
        description?: string;
        content?: string;
        author?: string;
        published_date?: Date;
        guid?: string;
    }): Promise<number>;
    getRSSFeeds(): Promise<any[]>;
    updateFeedLastFetched(feedId: number): Promise<void>;
    addFactCheck(factCheck: {
        article_id?: number;
        rss_item_id?: number;
        url?: string;
        claim: string;
        verdict: string;
        confidence_score: number;
        explanation?: string;
        sources?: string[];
        ai_model?: string;
    }): Promise<number>;
    getTopArticles(limit?: number): Promise<any[]>;
    getActiveRSSFeeds(): Promise<any[]>;
    rssItemExists(url: string): Promise<boolean>;
    insertRSSItem(item: {
        feedId: number;
        title: string;
        url: string;
        description?: string;
        content?: string;
        author?: string;
        publishedDate?: Date | null;
        guid?: string;
    }): Promise<number>;
    getLatestRSSItems(limit?: number): Promise<any[]>;
    getTopRSSItems(limit?: number): Promise<any[]>;
    searchRSSItems(query: string, limit?: number): Promise<any[]>;
    close(): Promise<void>;
    articleExists(url: string): Promise<boolean>;
    addRSSFeed(feedData: {
        name: string;
        url: string;
        category?: string;
        fetchInterval?: number;
    }): Promise<number>;
    removeRSSFeed(feedId: number): Promise<void>;
    toggleRSSFeed(feedId: number, isActive: boolean): Promise<void>;
    getAllRSSFeeds(): Promise<any[]>;
    updateRSSFeedInterval(feedId: number, intervalMinutes: number): Promise<void>;
    run(sql: string, params?: any[]): Promise<{
        lastID: number;
        changes: number;
    }>;
    all(sql: string, params?: any[]): Promise<any[]>;
    get(sql: string, params?: any[]): Promise<any>;
}
//# sourceMappingURL=database.d.ts.map