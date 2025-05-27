import axios from 'axios';
import * as cheerio from 'cheerio';
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

export class ArticleFetcher {
    private db: Database;
    private userAgent = 'Mozilla/5.0 (compatible; KagamiMe/1.0; +https://github.com/kagamime)';

    constructor(database: Database) {
        this.db = database;
    }

    async scrapeArticle(url: string): Promise<ArticleData> {
        console.log(`🔍 Scraping article: ${url}`);
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                },
                timeout: 10000,
                maxRedirects: 5
            });

            const $ = cheerio.load(response.data);
            
            // Extract title
            let title = $('h1').first().text().trim() || 
                       $('title').text().trim() || 
                       $('meta[property="og:title"]').attr('content') || 
                       'Unknown Title';

            // Extract content
            let content = this.extractContent($);
            
            // Extract author
            let author = $('meta[name="author"]').attr('content') || 
                        $('meta[property="article:author"]').attr('content') ||
                        $('.author').first().text().trim() ||
                        $('[rel="author"]').first().text().trim() || 
                        undefined;

            // Extract published date
            let publishedDate: Date | undefined;
            const dateStr = $('meta[property="article:published_time"]').attr('content') ||
                           $('meta[name="publish-date"]').attr('content') ||
                           $('time[datetime]').attr('datetime') ||
                           $('.date').first().text().trim();
            
            if (dateStr) {
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                    publishedDate = parsed;
                }
            }

            // Extract source/domain
            const domain = new URL(url).hostname.replace('www.', '');
            
            // Generate summary (first 300 chars of content)
            const summary = content.slice(0, 300) + (content.length > 300 ? '...' : '');

            return {
                title: title.slice(0, 500), // Limit title length
                url,
                content,
                summary,
                author,
                publishedDate,
                source: domain
            };

        } catch (error) {
            console.error('❌ Error scraping article:', error);
            throw new Error(`Failed to scrape article: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private extractContent($: cheerio.CheerioAPI): string {
        // Remove unwanted elements
        $('script, style, nav, footer, header, aside, .ad, .advertisement, .social-share').remove();
        
        // Try common content selectors
        const contentSelectors = [
            'article',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '.story-body',
            '.article-body'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length && element.text().trim().length > 100) {
                return element.text().trim();
            }
        }

        // Fallback: get all paragraphs
        const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
        return paragraphs.filter(p => p.length > 20).join('\n\n');
    }

    async saveArticle(articleData: ArticleData): Promise<number> {
        // Check if article already exists
        const exists = await this.db.articleExists(articleData.url);
        if (exists) {
            throw new Error('Article already exists in database');
        }

        return await this.db.addArticle(articleData);
    }

    async getArticleFromUrl(url: string): Promise<ArticleData> {
        return await this.scrapeArticle(url);
    }

    // Test if a domain is scrapeable
    async testDomain(domain: string): Promise<{ success: boolean; error?: string }> {
        try {
            const testUrl = domain.startsWith('http') ? domain : `https://${domain}`;
            const response = await axios.head(testUrl, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 5000,
                maxRedirects: 3
            });
            
            return { success: response.status < 400 };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
            };
        }
    }
}
