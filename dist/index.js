"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.client = void 0;
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const rssFetcher_1 = require("./utils/rssFetcher");
const articleFetcher_1 = require("./utils/articleFetcher");
const adminCommands_1 = require("./utils/adminCommands");
const settingsManager_1 = require("./utils/settingsManager");
const serverCommands_1 = require("./utils/serverCommands");
const multiAPIFactChecker_1 = require("./utils/multiAPIFactChecker");
const autoUpdateSystem_1 = require("./utils/autoUpdateSystem");
const node_cron_1 = __importDefault(require("node-cron"));
const promises_1 = __importDefault(require("fs/promises"));
// Load environment variables
dotenv_1.default.config();
// Version helper function
async function getVersion() {
    try {
        const versionData = await promises_1.default.readFile('version.json', 'utf-8');
        const version = JSON.parse(versionData);
        return version.version || '0.4.2';
    }
    catch (error) {
        return '0.4.2';
    }
}
// Initialize database and utilities
const db = new database_1.Database(process.env.DATABASE_PATH);
exports.db = db;
const settingsManager = new settingsManager_1.SettingsManager(db);
const rssFetcher = new rssFetcher_1.RSSFetcher(db);
const articleFetcher = new articleFetcher_1.ArticleFetcher(db);
const factChecker = new multiAPIFactChecker_1.MultiAPIFactChecker();
const adminCommands = new adminCommands_1.AdminCommands(db, rssFetcher, articleFetcher, settingsManager);
const serverCommands = new serverCommands_1.ServerCommands(db);
// Create Discord client
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
exports.client = client;
// Initialize auto-update system
let autoUpdateSystem;
// Bot ready event
client.once(discord_js_1.Events.ClientReady, async (readyClient) => {
    console.log(`🔥 KagamiMe v${await getVersion()} is ready! Logged in as ${readyClient.user.tag}`);
    try {
        await db.initialize();
        await settingsManager.initialize();
        // Initialize auto-update system
        autoUpdateSystem = new autoUpdateSystem_1.AutoUpdateSystem(client, db);
        await autoUpdateSystem.initialize();
        await db.logEvent('bot_startup', {
            user: readyClient.user.tag,
            version: await getVersion(),
            apis_enabled: factChecker.getAPIStatus()
        });
        console.log('✅ Database, settings, and auto-update system initialized');
        // Start cron jobs
        startRSSCronJob();
        startDailyDigestCronJob();
        startUpdateCheckCronJob();
        console.log('🕒 All cron jobs scheduled');
        // Start daily digest cron job
        startDailyDigestCronJob();
        console.log('📅 Daily digest cron job scheduled');
    }
    catch (error) {
        console.error('❌ Error during startup:', error);
    }
});
// Message handler
client.on(discord_js_1.Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (message.author.bot)
        return;
    // Check for command prefix
    const prefix = process.env.COMMAND_PREFIX || '!';
    if (!message.content.startsWith(prefix))
        return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    try {
        switch (command) {
            case 'kagami':
                await handleKagamiCommand(message, args);
                break;
            case 'admin':
                await adminCommands.handleAdminCommand(message, args);
                break;
            case 'server':
                await serverCommands.handleServerCommand(message, args);
                break;
            case 'status':
                await handleStatusCommand(message);
                break;
            case 'whoami':
                await handleWhoamiCommand(message);
                break;
            case 'cmds':
                await handleCmdsCommand(message);
                break;
            case 'ask':
                await handleAskCommand(message, args);
                break;
            case 'fact':
            case 'factcheck':
                await handleFactCheckCommand(message, args);
                break;
            default:
                // Log unknown command
                await db.logEvent('unknown_command', {
                    command,
                    user: message.author.tag,
                    guild: message.guild?.name
                });
                break;
        }
    }
    catch (error) {
        console.error('Error handling command:', error);
        await message.reply('❌ An error occurred while processing your command.');
        await db.logEvent('command_error', {
            command,
            error: error instanceof Error ? error.message : String(error),
            user: message.author.tag
        });
    }
});
// Kagami main command handler
async function handleKagamiCommand(message, args) {
    const subcommand = args[0]?.toLowerCase();
    switch (subcommand) {
        case 'pull':
            await message.reply('🔄 Fetching latest RSS feeds...');
            try {
                const results = await rssFetcher.fetchAllFeeds();
                const embed = {
                    title: '📡 RSS Fetch Complete',
                    color: results.errors.length > 0 ? 0xff9900 : 0x00ff00,
                    fields: [
                        { name: 'Successful', value: results.success.toString(), inline: true },
                        { name: 'Errors', value: results.errors.length.toString(), inline: true },
                        { name: 'Total Feeds', value: (results.success + results.errors.length).toString(), inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                if (results.errors.length > 0) {
                    embed.fields.push({
                        name: 'Error Details',
                        value: results.errors.slice(0, 3).join('\n').slice(0, 1024),
                        inline: false
                    });
                }
                await message.reply({ embeds: [embed] });
            }
            catch (error) {
                await message.reply('❌ Failed to fetch RSS feeds: ' + (error instanceof Error ? error.message : String(error)));
            }
            break;
        case 'latest':
            try {
                const latest = await rssFetcher.getLatestItems(5);
                if (latest.length === 0) {
                    await message.reply('📰 No recent articles found.');
                    return;
                }
                const embed = {
                    title: '📰 Latest News',
                    color: 0x0099ff,
                    fields: latest.map((item, index) => ({
                        name: `${index + 1}. ${item.title.slice(0, 100)}${item.title.length > 100 ? '...' : ''}`,
                        value: `📅 ${item.feed_name} • [Read more](${item.url})`,
                        inline: false
                    })),
                    timestamp: new Date().toISOString()
                };
                await message.reply({ embeds: [embed] });
            }
            catch (error) {
                await message.reply('❌ Failed to get latest articles: ' + (error instanceof Error ? error.message : String(error)));
            }
            break;
        case 'check':
            await message.reply('🔍 Fact-check functionality coming soon...');
            break;
        case 'analyze':
            await message.reply('📊 Analysis functionality coming soon...');
            break;
        default:
            await message.reply('🤖 **KagamiMe Commands:**\n' +
                '`!kagami pull` - Fetch latest RSS feeds\n' +
                '`!kagami latest` - Show latest news\n' +
                '`!kagami check <url>` - Fact-check an article\n' +
                '`!kagami analyze <url>` - Deep analysis of content');
            break;
    }
    await db.logEvent('kagami_command', {
        subcommand,
        user: message.author.tag,
        guild: message.guild?.name
    });
}
// Status command
async function handleStatusCommand(message) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const statusEmbed = {
        title: '🔥 KagamiMe Status',
        color: 0x00ff00,
        fields: [
            { name: 'Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
            { name: 'Database', value: '✅ Connected', inline: true },
        ],
        timestamp: new Date().toISOString(),
    };
    await message.reply({ embeds: [statusEmbed] });
    await db.logEvent('status_check', { user: message.author.tag });
}
// Whoami command
async function handleWhoamiCommand(message) {
    const user = message.author;
    const member = message.guild?.members.cache.get(user.id);
    const whoamiEmbed = {
        title: '👤 User Information',
        color: 0x0099ff,
        thumbnail: { url: user.displayAvatarURL() },
        fields: [
            { name: 'Username', value: user.tag, inline: true },
            { name: 'ID', value: user.id, inline: true },
            { name: 'Nickname', value: member?.nickname || 'None', inline: true },
            { name: 'Account Created', value: user.createdAt.toDateString(), inline: true },
            { name: 'Joined Server', value: member?.joinedAt?.toDateString() || 'Unknown', inline: true },
        ],
    };
    await message.reply({ embeds: [whoamiEmbed] });
    await db.logEvent('whoami_check', { user: user.tag });
}
// Commands list
async function handleCmdsCommand(message) {
    const commandsEmbed = {
        title: '🤖 KagamiMe Commands',
        color: 0xff9900,
        description: 'Your sovereign sentinel\'s arsenal of commands:',
        fields: [
            { name: '🔧 Basic Commands', value: '`!status` - Check bot status\n`!whoami` - Your user info\n`!cmds` - This command list', inline: false },
            { name: '🗞️ News Commands', value: '`!kagami pull` - Fetch latest RSS feeds\n`!kagami latest` - Show recent news\n`!kagami check <url>` - Fact-check article\n`!kagami analyze <url>` - Deep analysis', inline: false },
            { name: '🤖 AI Commands', value: '`!ask <question>` - Ask me anything\n`!fact <claim>` - Multi-API fact-check', inline: false },
        ],
        footer: { text: 'KagamiMe (鏡眼) - The best fake-news fighter' },
    };
    await message.reply({ embeds: [commandsEmbed] });
    await db.logEvent('commands_list', { user: message.author.tag });
}
// Ask command (AI interaction)
async function handleAskCommand(message, args) {
    if (args.length === 0) {
        await message.reply('❓ Please provide a question to ask.');
        return;
    }
    const question = args.join(' ');
    try {
        // Show typing indicator
        if (message.channel.type === 0) { // Text channel
            await message.channel.sendTyping();
        }
        // OpenAI integration has been removed
        await message.reply('🤖 **KagamiMe responds:**\nI\'m sorry, but AI-powered responses have been disabled in this version. Please check the documentation for more information.');
        await db.logEvent('ai_query_disabled', {
            question,
            user: message.author.tag
        });
    }
    catch (error) {
        console.error('Error in ask command:', error);
        await message.reply('❌ I encountered an error while processing your request. Please try again later.');
        await db.logEvent('command_error', {
            question,
            error: error instanceof Error ? error.message : String(error),
            user: message.author.tag
        });
    }
}
// Fact-check command (Multi-API fact verification)
async function handleFactCheckCommand(message, args) {
    if (args.length === 0) {
        await message.reply('❓ Please provide a claim to fact-check.\nExample: `!fact The Earth is flat`');
        return;
    }
    const claim = args.join(' ');
    // Check API status
    const apiStatus = factChecker.getAPIStatus();
    const availableAPIs = Object.entries(apiStatus).filter(([, enabled]) => enabled).map(([api]) => api);
    if (availableAPIs.length === 0) {
        await message.reply('❌ No fact-checking APIs are configured. Please contact an administrator.');
        return;
    }
    try {
        // Show typing indicator
        if (message.channel.type === 0) { // Text channel
            await message.channel.sendTyping();
        }
        // Initial message
        const statusMessage = await message.reply(`🔍 **Fact-checking claim...**\n📊 Using ${availableAPIs.length} API(s): ${availableAPIs.join(', ')}\n⏳ Please wait...`);
        // Perform fact-check
        const result = await factChecker.checkClaim(claim);
        // Create result embed
        const verdictColor = result.overall_verdict === 'true' ? 0x00ff00 :
            result.overall_verdict === 'false' ? 0xff0000 :
                result.overall_verdict === 'mixed' ? 0xffaa00 : 0x888888;
        const verdictEmoji = result.overall_verdict === 'true' ? '✅' :
            result.overall_verdict === 'false' ? '❌' :
                result.overall_verdict === 'mixed' ? '⚠️' : '❓';
        const factCheckEmbed = {
            title: `${verdictEmoji} Fact-Check Results`,
            description: `**Claim:** "${claim}"`,
            color: verdictColor,
            fields: [
                {
                    name: '📊 Overall Verdict',
                    value: `**${result.overall_verdict.toUpperCase()}**\nConfidence: ${(result.confidence_score * 100).toFixed(1)}%\nConsensus: ${result.consensus ? '✅ Yes' : '❌ No'}`,
                    inline: true
                },
                {
                    name: '🔬 API Results',
                    value: result.results.map(r => {
                        const icon = r.source === 'claimbuster' ? '🔬' :
                            r.source === 'google' ? '🌐' : '❓';
                        return `${icon} **${r.source.toUpperCase()}:** ${r.verdict} (${(r.confidence * 100).toFixed(0)}%)`;
                    }).join('\n'),
                    inline: false
                },
                {
                    name: '📝 Summary',
                    value: result.summary.length > 1000 ? result.summary.substring(0, 997) + '...' : result.summary,
                    inline: false
                }
            ],
            footer: {
                text: `KagamiMe (鏡眼) Multi-API Fact-Checker • ${result.results.length} APIs consulted`,
                icon_url: message.client.user?.displayAvatarURL()
            },
            timestamp: new Date().toISOString()
        };
        // Update the status message with results
        await statusMessage.edit({ content: '', embeds: [factCheckEmbed] });
        // Log the fact-check
        await db.logEvent('fact_check', {
            claim,
            verdict: result.overall_verdict,
            confidence: result.confidence_score,
            apis_used: availableAPIs,
            user: message.author.tag,
            guild: message.guild?.name
        });
    }
    catch (error) {
        console.error('Fact-check error:', error);
        await message.reply('❌ An error occurred while fact-checking your claim. Please try again later.');
        await db.logEvent('fact_check_error', {
            claim,
            error: error instanceof Error ? error.message : String(error),
            user: message.author.tag
        });
    }
}
// RSS Cron Job
function startRSSCronJob() {
    const interval = process.env.FETCH_INTERVAL_MINUTES || '30';
    const cronPattern = `*/${interval} * * * *`; // Every X minutes
    node_cron_1.default.schedule(cronPattern, async () => {
        console.log('⏰ RSS cron job triggered');
        // Check if RSS is enabled and not in maintenance mode
        if (!await settingsManager.getSetting('rss_enabled')) {
            console.log('🔇 RSS fetching is muted, skipping...');
            return;
        }
        if (serverCommands.isInMaintenanceMode()) {
            console.log('🔧 Maintenance mode active, skipping RSS fetch...');
            return;
        }
        try {
            const results = await rssFetcher.fetchAllFeeds();
            console.log(`📊 RSS fetch results: ${results.success} successful, ${results.errors.length} errors`);
        }
        catch (error) {
            console.error('❌ RSS cron job error:', error);
            await db.logEvent('rss_cron_error', { error: error instanceof Error ? error.message : String(error) });
        }
    });
    console.log(`🕒 RSS cron job scheduled: every ${interval} minutes`);
}
// Daily digest cron job
function startDailyDigestCronJob() {
    const digestTime = process.env.DAILY_DIGEST_TIME || '09:00';
    const [hour, minute] = digestTime.split(':');
    const cronPattern = `${minute} ${hour} * * *`; // Daily at specified time
    node_cron_1.default.schedule(cronPattern, async () => {
        console.log('📰 Daily digest triggered');
        // Check if digest is enabled and not in maintenance mode
        if (!await settingsManager.getSetting('digest_enabled')) {
            console.log('🔇 Daily digest is muted, skipping...');
            return;
        }
        if (serverCommands.isInMaintenanceMode()) {
            console.log('🔧 Maintenance mode active, skipping daily digest...');
            return;
        }
        try {
            await sendDailyDigest();
        }
        catch (error) {
            console.error('❌ Daily digest error:', error);
            await db.logEvent('daily_digest_error', { error: error instanceof Error ? error.message : String(error) });
        }
    });
    console.log(`📅 Daily digest scheduled: ${digestTime} daily`);
}
// Auto-update cron job
function startUpdateCheckCronJob() {
    const updateInterval = process.env.UPDATE_CHECK_INTERVAL_HOURS || '6';
    const cronPattern = `0 */${updateInterval} * * *`; // Every X hours
    node_cron_1.default.schedule(cronPattern, async () => {
        console.log('🔄 Auto-update check triggered');
        // Check if auto-updates are enabled and not in maintenance mode
        if (!await settingsManager.getSetting('auto_update_enabled')) {
            console.log('🔇 Auto-updates are disabled, skipping...');
            return;
        }
        if (serverCommands.isInMaintenanceMode()) {
            console.log('🔧 Maintenance mode active, skipping update check...');
            return;
        }
        try {
            const autoUpdater = new autoUpdateSystem_1.AutoUpdateSystem(client, db);
            const updateAvailable = await autoUpdater.checkForUpdates();
            if (updateAvailable) {
                console.log('🚀 Update available, starting auto-update process...');
                try {
                    await autoUpdater.performUpdate();
                    console.log('✅ Auto-update completed successfully');
                    await db.logEvent('auto_update_success', {
                        timestamp: new Date().toISOString(),
                        trigger: 'cron_job'
                    });
                }
                catch (updateError) {
                    console.log('❌ Auto-update failed:', updateError);
                    await db.logEvent('auto_update_failed', {
                        timestamp: new Date().toISOString(),
                        trigger: 'cron_job',
                        error: updateError instanceof Error ? updateError.message : String(updateError)
                    });
                }
            }
            else {
                console.log('✅ KagamiMe is up to date');
            }
        }
        catch (error) {
            console.error('❌ Auto-update cron job error:', error);
            await db.logEvent('auto_update_cron_error', {
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
        }
    });
    console.log(`🔄 Auto-update cron job scheduled: every ${updateInterval} hours`);
}
async function sendDailyDigest() {
    const channelId = process.env.NOTIFY_CHANNEL_ID;
    if (!channelId)
        return;
    const channel = client.channels.cache.get(channelId);
    if (!channel)
        return;
    const topStories = await rssFetcher.getTopStories(6);
    if (topStories.length === 0) {
        await channel.send('📰 **Daily Digest** - No new stories found today.');
        return;
    }
    const embed = {
        title: '📰 KagamiMe Daily Digest',
        description: 'Top news stories from your sentinel',
        color: 0x0099ff,
        fields: topStories.map((story, index) => ({
            name: `${index + 1}. ${story.title}`,
            value: `📅 ${story.feed_name} • [Read more](${story.url})\n${story.description || 'No description available'}`.slice(0, 1024),
            inline: false
        })),
        footer: { text: 'KagamiMe (鏡眼) - The best fake-news fighter' },
        timestamp: new Date().toISOString()
    };
    await channel.send({ embeds: [embed] });
    await db.logEvent('daily_digest_sent', { storiesCount: topStories.length });
}
// Error handling
client.on(discord_js_1.Events.Error, async (error) => {
    console.error('Discord client error:', error);
    await db.logEvent('client_error', { error: error.message });
});
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down KagamiMe...');
    await db.logEvent('bot_shutdown', { reason: 'SIGINT' });
    await db.close();
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down KagamiMe...');
    await db.logEvent('bot_shutdown', { reason: 'SIGTERM' });
    await db.close();
    client.destroy();
    process.exit(0);
});
// Login to Discord
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log('🔧 Running in development/test mode - Discord connection bypassed');
    console.log('✅ Bot initialized without connecting to Discord');
}
else {
    console.log('🔌 Connecting to Discord...');
    client.login(process.env.DISCORD_TOKEN);
}
//# sourceMappingURL=index.js.map