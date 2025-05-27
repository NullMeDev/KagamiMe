// Admin utility functions for KagamiMe
import { Message } from 'discord.js';

export function isOwner(userId: string): boolean {
    return userId === process.env.OWNER_ID;
}

export function isAdmin(userId: string): boolean {
    // Add more admin IDs here as needed
    const adminIds = [process.env.OWNER_ID];
    return adminIds.includes(userId);
}

export function requireOwner(message: Message): boolean {
    if (!isOwner(message.author.id)) {
        message.reply('❌ This command requires owner privileges.');
        return false;
    }
    return true;
}

export function requireAdmin(message: Message): boolean {
    if (!isAdmin(message.author.id)) {
        message.reply('❌ This command requires admin privileges.');
        return false;
    }
    return true;
}
