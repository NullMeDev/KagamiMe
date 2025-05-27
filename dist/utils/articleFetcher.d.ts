import { Database } from '../database';
export interface ArticleData {
    title: string;
    url: string;
    content: string;
    summary?: string;
    author?: string;
    publishedDate?: Date;
    source?: string;
}
export declare class ArticleFetcher {
    private db;
    private userAgent;
    constructor(database: Database);
    scrapeArticle(url: string): Promise<ArticleData>;
    private extractContent;
    saveArticle(articleData: ArticleData): Promise<number>;
    getArticleFromUrl(url: string): Promise<ArticleData>;
    testDomain(domain: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=articleFetcher.d.ts.map