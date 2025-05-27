// Server Management Commands for KagamiMe
// These commands allow server control through Discord

import { Message } from 'discord.js';
import { Database } from '../database';
import { requireOwner, requireAdmin } from './admin';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ServerCommands {
    private db: Database;
    private isMaintenanceMode: boolean = false;

    constructor(database: Database) {
        this.db = database;
    }

    async handleServerCommand(message: Message, args: string[]): Promise<void> {
        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
            case 'restart':
                await this.restartBot(message);
                break;
            case 'stop':
                await this.stopBot(message);
                break;
            case 'start':
                await this.startBot(message);
                break;
            case 'status':
                await this.getServerStatus(message);
                break;
            case 'update':
                await this.updateBot(message);
                break;
            case 'maintenance':
                await this.toggleMaintenance(message, args.slice(1));
                break;
            case 'logs':
                await this.getLogs(message, args.slice(1));
                break;
            case 'backup':
                await this.createBackup(message);
                break;
            case 'health':
                await this.healthCheck(message);
                break;
            case 'pause':
                await this.pauseOperations(message, args.slice(1));
                break;
            case 'resume':
                await this.resumeOperations(message);
                break;
            default:
                await this.showServerHelp(message);
                break;
        }

        await this.db.logEvent('server_command', {
            subcommand,
            user: message.author.tag,
            guild: message.guild?.name
        });
    }

    private async restartBot(message: Message): Promise<void> {
        if (!requireOwner(message)) return;

        try {
            // Send maintenance notification
            await this.sendMaintenanceNotification(message, 'restart');
            
            await message.reply('🔄 **KagamiMe is performing a restart...**\n' +
                '鏡眼 will be back online shortly. Please wait warmly~');

            await this.db.logEvent('server_restart', {
                initiated_by: message.author.tag,
                timestamp: new Date().toISOString()
            });

            // Graceful restart with delay
            setTimeout(async () => {
                try {
                    await execAsync('sudo systemctl restart kagamime-bot');
                } catch (error) {
                    console.error('Restart command failed:', error);
                }
            }, 3000);

        } catch (error) {
            await message.reply(`❌ Restart failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async stopBot(message: Message): Promise<void> {
        if (!requireOwner(message)) return;

        try {
            await this.sendMaintenanceNotification(message, 'stop');
            
            await message.reply('⏹️ **KagamiMe is shutting down...**\n' +
                '鏡眼 enters standby mode. Use `!server start` to bring me back online.');

            await this.db.logEvent('server_stop', {
                initiated_by: message.author.tag,
                timestamp: new Date().toISOString()
            });

            setTimeout(async () => {
                await execAsync('sudo systemctl stop kagamime-bot');
            }, 2000);

        } catch (error) {
            await message.reply(`❌ Stop failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async startBot(message: Message): Promise<void> {
        if (!requireOwner(message)) return;

        try {
            await execAsync('sudo systemctl start kagamime-bot');
            
            await message.reply('▶️ **KagamiMe startup initiated!**\n' +
                '🔥 鏡眼 is coming online... Systems initializing...');

            await this.db.logEvent('server_start', {
                initiated_by: message.author.tag,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await message.reply(`❌ Start failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async getServerStatus(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        try {
            const { stdout: systemctlStatus } = await execAsync('sudo systemctl is-active kagamime-bot');
            const { stdout: uptimeData } = await execAsync('uptime').catch(() => ({ stdout: 'N/A' }));
            const { stdout: memoryUsage } = await execAsync('free -h | grep Mem').catch(() => ({ stdout: 'N/A' }));
            const { stdout: diskUsage } = await execAsync('df -h /opt/kagamime | tail -1').catch(() => ({ stdout: 'N/A' }));

            const status = systemctlStatus.trim();
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);

            const embed = {
                title: '🖥️ KagamiMe Server Status',
                color: status === 'active' ? 0x00ff00 : 0xff0000,
                fields: [
                    { name: '🔌 Service Status', value: status === 'active' ? '✅ Online' : '❌ Offline', inline: true },
                    { name: '⏱️ Bot Uptime', value: `${hours}h ${minutes}m`, inline: true },
                    { name: '🧠 Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                    { name: '💻 System Uptime', value: uptimeData.trim(), inline: false },
                    { name: '🗄️ Memory Status', value: memoryUsage.trim(), inline: false },
                    { name: '💾 Disk Usage', value: diskUsage.trim(), inline: false },
                    { name: '🔧 Maintenance Mode', value: this.isMaintenanceMode ? '🔶 Enabled' : '🟢 Disabled', inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'KagamiMe Server Monitor' }
            };

            await message.reply({ embeds: [embed] });

        } catch (error) {
            await message.reply(`❌ Status check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async updateBot(message: Message): Promise<void> {
        if (!requireOwner(message)) return;

        try {
            await message.reply('🔄 **Starting KagamiMe update process...**\n' +
                'Pulling latest changes and rebuilding...');

            const { stdout: gitOutput } = await execAsync('cd /opt/kagamime && sudo -u kagamime git pull');
            
            if (gitOutput.includes('Already up to date')) {
                await message.reply('✅ **KagamiMe is already up to date!**\nNo changes detected.');
                return;
            }

            await message.reply('📦 **Installing dependencies and building...**');
            
            await execAsync('cd /opt/kagamime && sudo -u kagamime npm install && sudo -u kagamime npm run build');
            
            await message.reply('🔄 **Restarting with new version...**');
            
            await execAsync('sudo systemctl restart kagamime-bot');
            
            await this.db.logEvent('server_update', {
                initiated_by: message.author.tag,
                git_output: gitOutput,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await message.reply(`❌ Update failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async toggleMaintenance(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        const action = args[0]?.toLowerCase();
        
        if (action === 'on' || action === 'enable') {
            this.isMaintenanceMode = true;
            await message.reply('🔧 **Maintenance mode enabled**\n' +
                'KagamiMe operations are temporarily paused for maintenance.');
        } else if (action === 'off' || action === 'disable') {
            this.isMaintenanceMode = false;
            await message.reply('✅ **Maintenance mode disabled**\n' +
                'KagamiMe operations have resumed normally.');
        } else {
            await message.reply('❓ Usage: `!server maintenance <on|off>`');
        }
    }

    private async getLogs(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        try {
            const lines = args[0] ? parseInt(args[0]) : 20;
            const logType = args[1] || 'all';
            
            let command = `sudo journalctl -u kagamime-bot --no-pager -n ${lines}`;
            
            if (logType === 'error') {
                command += ' -p err';
            }

            const { stdout: logs } = await execAsync(command);
            
            // Truncate if too long for Discord
            const truncatedLogs = logs.length > 1900 ? logs.substring(0, 1900) + '...\n[Truncated]' : logs;
            
            await message.reply(`\`\`\`\n${truncatedLogs}\n\`\`\``);

        } catch (error) {
            await message.reply(`❌ Failed to get logs: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async createBackup(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        try {
            await message.reply('💾 **Creating backup...**');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `kagamime-backup-${timestamp}.tar.gz`;
            
            await execAsync(`sudo tar -czf /tmp/${backupName} -C /opt kagamime`);
            
            await message.reply(`✅ **Backup created successfully!**\n` +
                `📁 Location: \`/tmp/${backupName}\`\n` +
                `🕐 Created: ${new Date().toLocaleString()}`);

            await this.db.logEvent('server_backup', {
                backup_file: backupName,
                initiated_by: message.author.tag,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await message.reply(`❌ Backup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async healthCheck(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        const checks = {
            database: false,
            rss_feeds: false,
            disk_space: false,
            memory: false,
            network: false
        };

        try {
            // Database check
            try {
                await this.db.all('SELECT 1');
                checks.database = true;
            } catch (e) {}

            // RSS feeds check
            try {
                const feeds = await this.db.getAllRSSFeeds();
                checks.rss_feeds = feeds.length > 0;
            } catch (e) {}

            // Disk space check (>90% = unhealthy)
            try {
                const { stdout } = await execAsync('df /opt/kagamime | tail -1 | awk \'{print $5}\'');
                const usage = parseInt(stdout.replace('%', ''));
                checks.disk_space = usage < 90;
            } catch (e) {}

            // Memory check
            const memUsage = process.memoryUsage();
            checks.memory = memUsage.heapUsed < 400 * 1024 * 1024; // Less than 400MB

            // Network check (simple ping)
            try {
                await execAsync('ping -c 1 google.com');
                checks.network = true;
            } catch (e) {}

            const allHealthy = Object.values(checks).every(check => check);
            const healthyCount = Object.values(checks).filter(check => check).length;

            const embed = {
                title: '🏥 KagamiMe Health Check',
                color: allHealthy ? 0x00ff00 : (healthyCount >= 3 ? 0xffaa00 : 0xff0000),
                fields: [
                    { name: '💾 Database', value: checks.database ? '✅ Healthy' : '❌ Issues', inline: true },
                    { name: '📡 RSS Feeds', value: checks.rss_feeds ? '✅ Available' : '❌ None', inline: true },
                    { name: '💽 Disk Space', value: checks.disk_space ? '✅ Good' : '⚠️ Low', inline: true },
                    { name: '🧠 Memory', value: checks.memory ? '✅ Normal' : '⚠️ High', inline: true },
                    { name: '🌐 Network', value: checks.network ? '✅ Connected' : '❌ Issues', inline: true },
                    { name: '📊 Overall', value: `${healthyCount}/5 systems healthy`, inline: true }
                ],
                footer: { text: `Health check completed at ${new Date().toLocaleString()}` }
            };

            await message.reply({ embeds: [embed] });

        } catch (error) {
            await message.reply(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async pauseOperations(message: Message, args: string[]): Promise<void> {
        if (!requireAdmin(message)) return;

        const duration = args[0] ? parseInt(args[0]) : 60; // Default 60 minutes
        
        try {
            // Set maintenance mode
            this.isMaintenanceMode = true;
            
            await message.reply(`⏸️ **KagamiMe operations paused**\n` +
                `Duration: ${duration} minutes\n` +
                `🔔 Will automatically resume operations after the pause period.`);

            // Schedule resume
            setTimeout(async () => {
                this.isMaintenanceMode = false;
                const channel = message.channel;
                if (channel.isTextBased()) {
                    await channel.send('▶️ **KagamiMe operations resumed**\n' +
                        '🔥 All systems are back online and monitoring feeds!');
                }
            }, duration * 60 * 1000);

            await this.db.logEvent('server_pause', {
                duration_minutes: duration,
                initiated_by: message.author.tag,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await message.reply(`❌ Pause failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async resumeOperations(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        this.isMaintenanceMode = false;
        
        await message.reply('▶️ **KagamiMe operations resumed**\n' +
            '🔥 All systems are back online and monitoring feeds!');

        await this.db.logEvent('server_resume', {
            initiated_by: message.author.tag,
            timestamp: new Date().toISOString()
        });
    }

    private async sendMaintenanceNotification(message: Message, action: string): Promise<void> {
        const channelId = process.env.NOTIFY_CHANNEL_ID;
        if (!channelId) return;

        const channel = message.client.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return;

        const messages = {
            restart: '🔄 **KagamiMe (鏡眼) is performing a restart**\n' +
                    'Your digital sentinel will be back online shortly. Please wait warmly~ ✨\n' +
                    '*Estimated downtime: 30 seconds*',
            stop: '⏹️ **KagamiMe (鏡眼) is entering standby mode**\n' +
                  'Your digital sentinel is taking a well-deserved rest. 😴\n' +
                  '*Will return when summoned by administrators*'
        };

        await channel.send(messages[action as keyof typeof messages] || 'KagamiMe is performing maintenance...');
    }

    isInMaintenanceMode(): boolean {
        return this.isMaintenanceMode;
    }

    private async showServerHelp(message: Message): Promise<void> {
        if (!requireAdmin(message)) return;

        const embed = {
            title: '🖥️ Server Management Commands',
            color: 0x0099ff,
            description: 'Control KagamiMe server through Discord',
            fields: [
                {
                    name: '🔧 System Control (Owner Only)',
                    value: '`!server restart` - Restart the bot\n' +
                           '`!server stop` - Stop the bot\n' +
                           '`!server start` - Start the bot\n' +
                           '`!server update` - Update and restart bot',
                    inline: false
                },
                {
                    name: '📊 Monitoring (Admin)',
                    value: '`!server status` - Show server status\n' +
                           '`!server health` - Run health check\n' +
                           '`!server logs [lines] [type]` - View logs',
                    inline: false
                },
                {
                    name: '⚙️ Operations (Admin)',
                    value: '`!server maintenance <on|off>` - Toggle maintenance\n' +
                           '`!server pause [minutes]` - Pause operations\n' +
                           '`!server resume` - Resume operations\n' +
                           '`!server backup` - Create backup',
                    inline: false
                }
            ],
            footer: { text: 'Owner: Full access | Admin: Monitoring & operations' }
        };

        await message.reply({ embeds: [embed] });
    }
}
