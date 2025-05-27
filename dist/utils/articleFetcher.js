"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleFetcher = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
class ArticleFetcher {
    constructor(database) {
        this.userAgent = 'Mozilla/5.0 (compatible; KagamiMe/1.0; +https://github.com/kagamime)';
        this.db = database;
    }
    async scrapeArticle(url) {
        console.log(`🔍 Scraping article: ${url}`);
        try {
            const response = await axios_1.default.get(url, {
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
            let publishedDate;
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
        }
        catch (error) {
            console.error('❌ Error scraping article:', error);
            throw new Error(`Failed to scrape article: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    extractContent($) {
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
    async saveArticle(articleData) {
        // Check if article already exists
        const exists = await this.db.articleExists(articleData.url);
        if (exists) {
            throw new Error('Article already exists in database');
        }
        return await this.db.addArticle(articleData);
    }
    async getArticleFromUrl(url) {
        return await this.scrapeArticle(url);
    }
    // Test if a domain is scrapeable
    async testDomain(domain) {
        try {
            const testUrl = domain.startsWith('http') ? domain : `https://${domain}`;
            const response = await axios_1.default.head(testUrl, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 5000,
                maxRedirects: 3
            });
            return { success: response.status < 400 };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
exports.ArticleFetcher = ArticleFetcher;
//# sourceMappingURL=articleFetcher.js.map