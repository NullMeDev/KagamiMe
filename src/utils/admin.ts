// Admin utility functions for KagamiMe
import { Message } from 'discord.js';
import { Database } from '../database';

// Define role types in order of hierarchy (higher index = higher privilege)
export enum RoleType {
    Viewer = 0,
    Moderator = 1,
    Admin = 2,
    Owner = 3
}

// Map role types to string representations
export const RoleNames: Record<RoleType, string> = {
    [RoleType.Viewer]: 'Viewer',
    [RoleType.Moderator]: 'Moderator',
    [RoleType.Admin]: 'Admin',
    [RoleType.Owner]: 'Owner'
};

// Database instance
let database: Database | null = null;

/**
 * Initialize the admin module with a database connection
 */
export function initAdminModule(db: Database): void {
    database = db;
}

/**
 * Check if a user is the owner
 */
export function isOwner(userId: string): boolean {
    return userId === process.env.OWNER_ID;
}

/**
 * Check if a user has Admin role (includes Owner)
 */
export async function isAdmin(userId: string): Promise<boolean> {
    // Owner is always admin
    if (isOwner(userId)) {
        return true;
    }

    // Check database for role
    return await hasRole(userId, RoleType.Admin);
}

/**
 * Check if a user has Moderator role (includes Admin and Owner)
 */
export async function isModerator(userId: string): Promise<boolean> {
    // Admin and Owner are always moderators
    if (await isAdmin(userId)) {
        return true;
    }

    // Check database for role
    return await hasRole(userId, RoleType.Moderator);
}

/**
 * Check if a user has Viewer role (includes Moderator, Admin, and Owner)
 */
export async function isViewer(userId: string): Promise<boolean> {
    // Moderator, Admin, and Owner are always viewers
    if (await isModerator(userId)) {
        return true;
    }

    // Check database for role
    return await hasRole(userId, RoleType.Viewer);
}

/**
 * Check if a user has at least the specified role level
 */
export async function hasRole(userId: string, minRoleType: RoleType): Promise<boolean> {
    // Owner always has all roles
    if (isOwner(userId)) {
        return true;
    }

    if (!database) {
        console.error('Database not initialized in admin module');
        return false;
    }

    try {
        // Get the user's highest role from the database
        const row = await database.get(
            'SELECT MAX(role_type) as max_role FROM user_roles WHERE user_id = ?',
            [userId]
        );

        if (!row || row.max_role === undefined || row.max_role === null) {
            return false;
        }

        // Check if the user's role is at least the minimum required role
        return row.max_role >= minRoleType;
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}

/**
 * Require owner permissions
 */
export function requireOwner(message: Message): boolean {
    if (!isOwner(message.author.id)) {
        message.reply('❌ This command requires owner privileges.');
        return false;
    }
    return true;
}

/**
 * Require admin permissions
 */
export async function requireAdmin(message: Message): Promise<boolean> {
    if (!await isAdmin(message.author.id)) {
        message.reply('❌ This command requires admin privileges.');
        return false;
    }
    return true;
}

/**
 * Require moderator permissions
 */
export async function requireModerator(message: Message): Promise<boolean> {
    if (!await isModerator(message.author.id)) {
        message.reply('❌ This command requires moderator privileges.');
        return false;
    }
    return true;
}

/**
 * Require viewer permissions
 */
export async function requireViewer(message: Message): Promise<boolean> {
    if (!await isViewer(message.author.id)) {
        message.reply('❌ This command requires viewer privileges.');
        return false;
    }
    return true;
}

/**
 * Add a role to a user
 */
export async function addUserRole(userId: string, roleType: RoleType): Promise<boolean> {
    if (!database) {
        console.error('Database not initialized in admin module');
        return false;
    }

    try {
        // Don't allow setting anyone as owner through this function
        if (roleType === RoleType.Owner) {
            return false;
        }

        // Insert or replace the user's role
        await database.run(
            'INSERT OR REPLACE INTO user_roles (user_id, role_type) VALUES (?, ?)',
            [userId, roleType]
        );

        return true;
    } catch (error) {
        console.error('Error adding user role:', error);
        return false;
    }
}

/**
 * Remove a role from a user
 */
export async function removeUserRole(userId: string, roleType: RoleType): Promise<boolean> {
    if (!database) {
        console.error('Database not initialized in admin module');
        return false;
    }

    try {
        // Delete the specified role for the user
        await database.run(
            'DELETE FROM user_roles WHERE user_id = ? AND role_type = ?',
            [userId, roleType]
        );

        return true;
    } catch (error) {
        console.error('Error removing user role:', error);
        return false;
    }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<RoleType[]> {
    if (!database) {
        console.error('Database not initialized in admin module');
        return [];
    }

    try {
        // Get all roles for the user
        const rows = await database.all(
            'SELECT role_type FROM user_roles WHERE user_id = ?',
            [userId]
        );

        // Add Owner role if applicable
        const roles = rows.map(row => row.role_type as RoleType);
        if (isOwner(userId)) {
            roles.push(RoleType.Owner);
        }

        return roles;
    } catch (error) {
        console.error('Error getting user roles:', error);
        return [];
    }
}
