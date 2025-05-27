"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwner = isOwner;
exports.isAdmin = isAdmin;
exports.requireOwner = requireOwner;
exports.requireAdmin = requireAdmin;
function isOwner(userId) {
    return userId === process.env.OWNER_ID;
}
function isAdmin(userId) {
    // Add more admin IDs here as needed
    const adminIds = [process.env.OWNER_ID];
    return adminIds.includes(userId);
}
function requireOwner(message) {
    if (!isOwner(message.author.id)) {
        message.reply('❌ This command requires owner privileges.');
        return false;
    }
    return true;
}
function requireAdmin(message) {
    if (!isAdmin(message.author.id)) {
        message.reply('❌ This command requires admin privileges.');
        return false;
    }
    return true;
}
//# sourceMappingURL=admin.js.map