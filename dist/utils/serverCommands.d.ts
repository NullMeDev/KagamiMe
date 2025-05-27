import { Message } from 'discord.js';
import { Database } from '../database';
export declare class ServerCommands {
    private db;
    private isMaintenanceMode;
    constructor(database: Database);
    handleServerCommand(message: Message, args: string[]): Promise<void>;
    private restartBot;
    private stopBot;
    private startBot;
    private getServerStatus;
    private updateBot;
    private toggleMaintenance;
    private getLogs;
    private createBackup;
    private healthCheck;
    private pauseOperations;
    private resumeOperations;
    private sendMaintenanceNotification;
    isInMaintenanceMode(): boolean;
    private showServerHelp;
}
//# sourceMappingURL=serverCommands.d.ts.map