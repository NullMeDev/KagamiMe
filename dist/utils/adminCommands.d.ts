import { Message } from 'discord.js';
import { Database } from '../database';
import { RSSFetcher } from '../utils/rssFetcher';
import { ArticleFetcher } from '../utils/articleFetcher';
import { SettingsManager } from '../utils/settingsManager';
export declare class AdminCommands {
    private db;
    private rssFetcher;
    private articleFetcher;
    private settings;
    constructor(database: Database, rssFetcher: RSSFetcher, articleFetcher: ArticleFetcher, settings: SettingsManager);
    handleAdminCommand(message: Message, args: string[]): Promise<void>;
    private addRSSFeed;
    private testRSSFeed;
    private removeRSSFeed;
    private listRSSFeeds;
    private toggleRSSFeed;
    private addArticle;
    private testDomain;
    private setFeedInterval;
    private muteFeature;
    private unmuteFeature;
    private showAdminHelp;
}
//# sourceMappingURL=adminCommands.d.ts.map