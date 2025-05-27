"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = exports.db = exports.client = void 0;
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const rssFetcher_1 = require("./utils/rssFetcher");
const articleFetcher_1 = require("./utils/articleFetcher");
const adminCommands_1 = require("./utils/adminCommands");
const settingsManager_1 = require("./utils/settingsManager");
const serverCommands_1 = require("./utils/serverCommands");
const openai_1 = __importDefault(require("openai"));
const node_cron_1 = __importDefault(require("node-cron"));
// Load environment variables
dotenv_1.default.config();
// Initialize OpenAI
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
exports.openai = openai;
// Initialize database and utilities
const db = new database_1.Database(process.env.DATABASE_PATH);
exports.db = db;
const settingsManager = new settingsManager_1.SettingsManager(db);
const rssFetcher = new rssFetcher_1.RSSFetcher(db);
const articleFetcher = new articleFetcher_1.ArticleFetcher(db);
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
// Bot ready event
client.once(discord_js_1.Events.ClientReady, async (readyClient) => {
    console.log(`🔥 KagamiMe is ready! Logged in as ${readyClient.user.tag}`);
    try {
        await db.initialize();
        await settingsManager.initialize();
        await db.logEvent('bot_startup', { user: readyClient.user.tag });
        console.log('✅ Database and settings initialized, startup logged');
        // Start RSS fetching cron job
        startRSSCronJob();
        startDailyDigestCronJob();
        console.log('🕒 Cron jobs scheduled');
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
            { name: '🤖 AI Commands', value: '`!ask <question>` - Ask me anything', inline: false },
        ],
        footer: { text: 'KagamiMe (鏡眼) - Your digital sentinel' },
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
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are KagamiMe (鏡眼), a sovereign anime-inspired digital sentinel. You are knowledgeable, helpful, and have a slightly formal but friendly tone. Keep responses concise and informative.'
                },
                {
                    role: 'user',
                    content: question
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });
        const aiReply = response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
        await message.reply(`🤖 **KagamiMe responds:**\n${aiReply}`);
        await db.logEvent('ai_query', {
            question,
            response: aiReply,
            user: message.author.tag,
            model: 'gpt-3.5-turbo'
        });
    }
    catch (error) {
        console.error('OpenAI error:', error);
        await message.reply('❌ I encountered an error while processing your question. Please try again later.');
        await db.logEvent('ai_error', {
            question,
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
        footer: { text: 'KagamiMe (鏡眼) - Your digital sentinel' },
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
client.login(process.env.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map