#!/usr/bin/env node

/**
 * KagamiMe Environment Variables Verification Script
 * This script loads the .env file and prints key configuration values
 * to verify they are correctly loaded.
 * 
 * Usage: node check-env.js
 */

// Load dotenv
require('dotenv').config();

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.magenta}=== KagamiMe Environment Variables Check ===${colors.reset}\n`);

// Function to check and print variable status
function checkVariable(name, isSecret = false) {
  const value = process.env[name];
  const displayValue = value && isSecret ? `${value.substring(0, 6)}...` : value || 'NOT SET';
  const status = value ? colors.green + '✓' : colors.red + '✗';
  
  console.log(`${status} ${colors.reset}${colors.cyan}${name}:${colors.reset} ${displayValue}`);
  
  return !!value;
}

// Check Discord configuration
console.log(`${colors.magenta}Discord Configuration:${colors.reset}`);
const discordTokenOk = checkVariable('DISCORD_TOKEN', true);
const discordClientIdOk = checkVariable('DISCORD_CLIENT_ID');
const discordGuildIdOk = checkVariable('DISCORD_GUILD_ID');
const discordChannelIdOk = checkVariable('DISCORD_CHANNEL_ID');
const ownerIdOk = checkVariable('OWNER_ID');

// Check API keys
console.log(`\n${colors.magenta}API Keys:${colors.reset}`);
const googleApiKeyOk = checkVariable('GOOGLE_API_KEY', true);
const claimbusterApiKeyOk = checkVariable('CLAIMBUSTER_API_KEY', true);
checkVariable('NEWS_API_KEY', true);

// Check database configuration
console.log(`\n${colors.magenta}Database Configuration:${colors.reset}`);
checkVariable('DATABASE_PATH');

// Check RSS configuration
console.log(`\n${colors.magenta}RSS Configuration:${colors.reset}`);
checkVariable('FETCH_INTERVAL_MINUTES');
checkVariable('RSS_CHECK_INTERVAL');

// Check bot configuration
console.log(`\n${colors.magenta}Bot Configuration:${colors.reset}`);
checkVariable('BOT_NAME');
checkVariable('BOT_PREFIX');
checkVariable('VERSION');

// Summary
console.log(`\n${colors.magenta}Summary:${colors.reset}`);
const criticalOk = discordTokenOk && discordClientIdOk && discordGuildIdOk && discordChannelIdOk && ownerIdOk;
const factCheckingOk = googleApiKeyOk || claimbusterApiKeyOk;

if (criticalOk) {
  console.log(`${colors.green}✓ Core Discord configuration is valid${colors.reset}`);
} else {
  console.log(`${colors.red}✗ Core Discord configuration is incomplete - bot will not function correctly${colors.reset}`);
}

if (factCheckingOk) {
  console.log(`${colors.green}✓ At least one fact-checking API is configured${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠ No fact-checking APIs configured - fact-checking features will be disabled${colors.reset}`);
}

console.log(`\n${colors.cyan}Environment variables from .env file have been loaded.${colors.reset}`);
console.log(`${colors.cyan}You can now run the bot with:${colors.reset}`);
console.log(`${colors.yellow}NODE_ENV=development node dist/index.js${colors.reset}`);

