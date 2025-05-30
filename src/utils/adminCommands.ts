import { Message } from 'discord.js';
import { Database } from '../database';
import { RSSFetcher } from '../utils/rssFetcher';
import { ArticleFetcher } from '../utils/articleFetcher';
import { SettingsManager } from '../utils/settingsManager';
import { requireOwner, requireAdmin } from '../utils/admin';

export class AdminCommands {
    private db: Database;
    private rssFetcher: RSSFetcher;
    private articleFetcher: ArticleFetcher;
    private settings: SettingsManager;

    constructor(database: Database, rssFetcher: RSSFetcher, articleFetcher: ArticleFetcher, settings: SettingsManager) {
        this.db = database;
        this.rssFetcher = rssFetcher;
        this.articleFetcher = articleFetcher;
        this.settings = settings;
    }

    async handleAdminCommand(message: Message, args: string[]): Promise<void> {
        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
            case 'addrss':
                await this.addRSSFeed(message, args.slice(1));
                break;
            case 'removerss':
                await this.removeRSSFeed(message, args.slice(1));
                break;
            case 'listrss':
                await this.listRSSFeeds(message);
                break;
            case 'togglerss':
                await this.toggleRSSFeed(message, args.slice(1));
                break;
            case 'cleanup':
                await this.cleanupFeeds(message, args.slice(1));
                break;
            case 'addarticle':
                await this.addArticle(message, args.slice(1));
                break;
            case 'testdomain':
                await this.testDomain(message, args.slice(1));
                break;
            case 'setinterval':
                await this.setFeedInterval(message, args.slice(1));
                break;
            case 'mute':
                await this.muteFeature(message, args.slice(1));
                break;
            case 'unmute':
                await this.unmuteFeature(message, args.slice(1));
                break;
            default:
                await this.showAdminHelp(message);
                break;
        }
    }

    private async addRSSFeed(message: Message, args: string[]): Promise<void> {
        if (!requireOwner(message)) return;

        if (args.length < 2) {
            await message.reply('❌ Usage: `!admin addrss <name> <url> [category] [interval_minutes]`');
            return;
        }

        const [name, url, category = 'general', intervalStr = '30'] = args;
        const interval = parseInt(intervalStr) || 30;

        try {
            // Test the RSS feed first
            await message.reply('🧪 Testing RSS feed...');
            
            const testResult = await this.testRSSFeed(url);
            if (!testResult.success) {
                await message.reply(`❌ RSS feed test failed: ${testResult.error}`);
                return;
            }

            // Add to database
            const feedId = await this.db.addRSSFeed({
                name,
                url,
                category,
                fetchInterval: interval
            });

            await message.reply(`✅ RSS feed added successfully!\n` +
                `**ID:** ${feedId}\n**Name:** ${name}\n**URL:** ${url}\n` +
                `**Category:** ${category}\n**Interval:** ${interval} minutes`);

            await this.db.logEvent('admin_add_rss', {
                feedId,
                name,
                url,
                category,
                interval,
                admin: message.author.tag
            });

        } catch (error) {
            await message.reply(`❌ Failed to add RSS feed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async testRSSFeed(url: string): Promise<{ success: boolean; error?: string; itemCount?: number }> {
        try {
            const Parser = require('rss-parser');
            const parser = new Parser();
            const feed = await parser.parseURL(url);
            
            return { 
                success: true, 
                itemCount: feed.items?.length || 0 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
            };
        }
    }

    private async removeRSSFeed(message: Message, args: string[]): Promise<void> {
        if (!requireOwner(message)) return;

        if (args.length < 1) {
            await message.reply('❌ Usage: `!admin removerss <feed_id>`');
            return;
        }

        const feedId = parseInt(args[0]);
        if (isNaN(feedId)) {
            await message.reply('❌ Feed ID must be a number');
            return;
        }

        try {
            await this.db.removeRSSFeed(feedId);
            await message.reply(`✅ RSS feed ${feedId} removed successfully`);
            
            await this.db.logEvent('admin_remove_rss', {
                feedId,
                admin: message.author.tag
            });
        } catch (error) {
            await message.reply(`❌ Failed to remove RSS feed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async listRSSFeeds(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        try {
            const feeds = await this.db.getAllRSSFeeds();
            
            if (feeds.length === 0) {
                await message.reply('📰 No RSS feeds configured');
                return;
            }

            const feedList = feeds.map(feed => 
                `**${feed.id}.** ${feed.name}\n` +
                `   URL: ${feed.url}\n` +
                `   Category: ${feed.category} | Interval: ${feed.fetch_interval_minutes}m | Active: ${feed.is_active ? '✅' : '❌'}\n` +
                `   Last Fetched: ${feed.last_fetched || 'Never'}\n`
            ).join('\n');

            // Split into multiple messages if too long
            const chunks = feedList.match(/.{1,1800}/g) || [feedList];
            
            await message.reply(`📰 **RSS Feeds (${feeds.length} total)**\n\n${chunks[0]}`);
            
            for (let i = 1; i < chunks.length; i++) {
                await message.reply(chunks[i]);
            }
        } catch (error) {
            await message.reply(`❌ Failed to list RSS feeds: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async toggleRSSFeed(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        if (args.length < 2) {
            await message.reply('❌ Usage: `!admin togglerss <feed_id> <true|false>`');
            return;
        }

        const feedId = parseInt(args[0]);
        const isActive = args[1].toLowerCase() === 'true';

        if (isNaN(feedId)) {
            await message.reply('❌ Feed ID must be a number');
            return;
        }

        try {
            await this.db.toggleRSSFeed(feedId, isActive);
            await message.reply(`✅ RSS feed ${feedId} ${isActive ? 'enabled' : 'disabled'}`);
            
            await this.db.logEvent('admin_toggle_rss', {
                feedId,
                isActive,
                admin: message.author.tag
            });
        } catch (error) {
            await message.reply(`❌ Failed to toggle RSS feed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async addArticle(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        if (args.length < 1) {
            await message.reply('❌ Usage: `!admin addarticle <url>`');
            return;
        }

        const url = args[0];

        try {
            await message.reply('🔍 Scraping article...');
            
            const articleData = await this.articleFetcher.scrapeArticle(url);
            const articleId = await this.articleFetcher.saveArticle(articleData);

            const embed = {
                title: '✅ Article Added Successfully',
                color: 0x00ff00,
                fields: [
                    { name: 'ID', value: articleId.toString(), inline: true },
                    { name: 'Title', value: articleData.title.slice(0, 100) + (articleData.title.length > 100 ? '...' : ''), inline: false },
                    { name: 'Source', value: articleData.source || 'Unknown', inline: true },
                    { name: 'Author', value: articleData.author || 'Unknown', inline: true },
                    { name: 'URL', value: url, inline: false }
                ],
                timestamp: new Date().toISOString()
            };

            await message.reply({ embeds: [embed] });

            await this.db.logEvent('admin_add_article', {
                articleId,
                url,
                title: articleData.title,
                admin: message.author.tag
            });

        } catch (error) {
            await message.reply(`❌ Failed to add article: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async testDomain(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        if (args.length < 1) {
            await message.reply('❌ Usage: `!admin testdomain <domain_or_url>`');
            return;
        }

        const domain = args[0];

        try {
            await message.reply('🧪 Testing domain accessibility...');
            
            const result = await this.articleFetcher.testDomain(domain);
            
            if (result.success) {
                await message.reply(`✅ Domain ${domain} is accessible and scrapeable`);
            } else {
                await message.reply(`❌ Domain ${domain} failed: ${result.error}`);
            }
        } catch (error) {
            await message.reply(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async setFeedInterval(message: Message, args: string[]): Promise<void> {
        if (!requireOwner(message)) return;

        if (args.length < 2) {
            await message.reply('❌ Usage: `!admin setinterval <feed_id> <minutes>`');
            return;
        }

        const feedId = parseInt(args[0]);
        const minutes = parseInt(args[1]);

        if (isNaN(feedId) || isNaN(minutes) || minutes < 1) {
            await message.reply('❌ Invalid feed ID or interval');
            return;
        }

        try {
            await this.db.updateRSSFeedInterval(feedId, minutes);
            await message.reply(`✅ Feed ${feedId} interval set to ${minutes} minutes`);
            
            await this.db.logEvent('admin_set_interval', {
                feedId,
                minutes,
                admin: message.author.tag
            });
        } catch (error) {
            await message.reply(`❌ Failed to set interval: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async muteFeature(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        const feature = args[0]?.toLowerCase();
        
        if (!['rss', 'digest', 'all'].includes(feature)) {
            await message.reply('❌ Usage: `!admin mute <rss|digest|all>`');
            return;
        }

        try {
            if (feature === 'rss' || feature === 'all') {
                await this.settings.setSetting('rss_enabled', false);
            }
            if (feature === 'digest' || feature === 'all') {
                await this.settings.setSetting('digest_enabled', false);
            }

            await message.reply(`🔇 ${feature === 'all' ? 'All features' : feature} muted successfully`);
            
            await this.db.logEvent('admin_mute', { 
                feature,
                admin: message.author.tag 
            });
        } catch (error) {
            await message.reply(`❌ Failed to mute ${feature}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async unmuteFeature(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        const feature = args[0]?.toLowerCase();
        
        if (!['rss', 'digest', 'all'].includes(feature)) {
            await message.reply('❌ Usage: `!admin unmute <rss|digest|all>`');
            return;
        }

        try {
            if (feature === 'rss' || feature === 'all') {
                await this.settings.setSetting('rss_enabled', true);
            }
            if (feature === 'digest' || feature === 'all') {
                await this.settings.setSetting('digest_enabled', true);
            }

            await message.reply(`🔊 ${feature === 'all' ? 'All features' : feature} unmuted successfully`);
            
            await this.db.logEvent('admin_unmute', { 
                feature,
                admin: message.author.tag 
            });
        } catch (error) {
            await message.reply(`❌ Failed to unmute ${feature}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async showAdminHelp(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        const embed = {
            title: '🔧 Admin Commands',
            color: 0xff0000,
            description: 'Administrative commands for KagamiMe',
            fields: [
                {
                    name: '📡 RSS Management',
                    value: '`!admin addrss <name> <url> [category] [interval]` - Add RSS feed\n' +
                           '`!admin removerss <id>` - Remove RSS feed\n' +
                           '`!admin listrss` - List all RSS feeds\n' +
                           '`!admin togglerss <id> <true|false>` - Enable/disable feed\n' +
                           '`!admin setinterval <id> <minutes>` - Set fetch interval\n' +
                           '`!admin cleanup [--dry-run] [--force]` - Clean up dead RSS feeds',
                    inline: false
                },
                {
                    name: '📰 Article Management',
                    value: '`!admin addarticle <url>` - Scrape and add article\n' +
                           '`!admin testdomain <domain>` - Test domain accessibility',
                    inline: false
                },
                {
                    name: '🔇 Controls',
                    value: '`!admin mute <rss|digest|all>` - Mute features\n' +
                           '`!admin unmute <rss|digest|all>` - Unmute features',
                    inline: false
                }
            ],
            footer: { text: 'Owner: All commands | Admin: Limited commands' }
        };

        await message.reply({ embeds: [embed] });
    }

    private async cleanupFeeds(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;
        
        // Parse arguments
        const dryRun = args.includes('--dry-run') || args.includes('-d');
        const force = args.includes('--force') || args.includes('-f');
        
        try {
            await message.reply('🧹 **Starting RSS feed cleanup...**\n' +
                'Checking for dead or inactive feeds. This may take a moment...');
            
            if (dryRun) {
                // Only identify dead feeds without disabling them
                const feeds = await this.db.getAllRSSFeeds();
                let deadFeedsCount = 0;
                let inactiveFeeds = [];
                
                for (const feed of feeds) {
                    // Test the feed
                    const testResult = await this.rssFetcher.testFeed(feed.url);
                    if (!testResult.success) {
                        deadFeedsCount++;
                        inactiveFeeds.push({
                            id: feed.id,
                            name: feed.name,
                            reason: testResult.error
                        });
                    }
                }
                
                // Report findings
                if (deadFeedsCount === 0) {
                    await message.reply('✅ **No dead RSS feeds found!**\n' +
                        'All your feeds appear to be working correctly.');
                } else {
                    const feedList = inactiveFeeds.map(feed => 
                        `**${feed.id}.** ${feed.name}\n   Reason: ${feed.reason}`
                    ).join('\n');
                    
                    await message.reply(`⚠️ **Found ${deadFeedsCount} potentially dead RSS feeds:**\n\n` +
                        `${feedList}\n\n` +
                        'To clean up these feeds, run: `!admin cleanup` without the `--dry-run` flag.');
                }
            } else {
                // Actually perform the cleanup
                const results = await this.rssFetcher.cleanDeadFeeds(
                    force ? 1 : 3,  // Lower threshold if force flag is used
                    force ? 3 : 7   // Lower threshold if force flag is used
                );
                
                if (results.cleaned === 0) {
                    await message.reply('✅ **No dead RSS feeds found to clean up!**\n' +
                        'All your feeds appear to be working correctly.');
                } else {
                    await message.reply(`🧹 **RSS feed cleanup complete!**\n` +
                        `Disabled ${results.cleaned} out of ${results.total} feeds that were dead or inactive.\n` +
                        'Use `!admin listrss` to see the current status of all feeds.');
                    
                    await this.db.logEvent('admin_cleanup_feeds', {
                        cleaned: results.cleaned,
                        total: results.total,
                        force: force,
                        admin: message.author.tag
                    });
                }
            }
        } catch (error) {
            await message.reply(`❌ Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
