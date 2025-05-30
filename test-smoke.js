#!/usr/bin/env node

/**
 * KagamiMe Smoke Test
 * A basic test to verify core functionality is working
 * 
 * Usage:
 *   node test-smoke.js
 * 
 * Exit codes:
 *   0 - All tests passed
 *   1 - Test failed
 */

// Set test environment
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

// Imports
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execSync } = require('child_process');
const accessAsync = promisify(fs.access);

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test result tracking
let testsRun = 0;
let testsPassed = 0;

// -------------------------
// Test utilities
// -------------------------

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
  testsPassed++;
  testsRun++;
}

function logFailure(message, error = null) {
  console.error(`${colors.red}✗ ${message}${colors.reset}`);
  if (error) {
    console.error(`  ${colors.red}Error: ${error.message || error}${colors.reset}`);
    if (error.stack) {
      console.error(`  ${colors.red}Stack: ${error.stack.split('\n')[1]}${colors.reset}`);
    }
  }
  testsRun++;
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

async function runTest(testName, testFn) {
  try {
    logInfo(`Running test: ${testName}`);
    await testFn();
    logSuccess(`${testName} passed`);
    return true;
  } catch (error) {
    logFailure(`${testName} failed`, error);
    return false;
  }
}

// -------------------------
// Actual test cases
// -------------------------

async function testBuildVerification() {
  // Check if the project has been built
  if (!fs.existsSync('./dist')) {
    throw new Error('dist directory not found. Run npm run build first.');
  }
  
  // Check for critical files
  const requiredFiles = [
    './dist/index.js',
    './dist/database.js',
    './dist/utils/rssFetcher.js',
    './dist/utils/multiAPIFactChecker.js'
  ];
  
  for (const file of requiredFiles) {
    await accessAsync(file, fs.constants.F_OK);
  }
}

async function testDatabaseConnection() {
  // We can either:
  // 1. Import the Database class directly and test it
  // 2. Use a simple SQLite check with the sqlite3 module
  
  // For simplicity, we'll use a simpler approach since we don't want to load the entire app
  try {
    // If the database module exists, we can use it directly
    const sqlite3 = require('sqlite3').verbose();
    
    // Ensure database directory exists
    const dbDir = path.dirname(process.env.DATABASE_PATH || './data/kagamime.db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Open the database
    const db = new sqlite3.Database(process.env.DATABASE_PATH || './data/kagamime.db');
    
    // Simple query to test connection
    await new Promise((resolve, reject) => {
      db.get('SELECT 1 as value', (err, row) => {
        if (err) reject(err);
        else {
          if (row && row.value === 1) {
            resolve();
          } else {
            reject(new Error('Database query did not return expected result'));
          }
        }
      });
    });
    
    // Close the database
    await new Promise((resolve, reject) => {
      db.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function testPackageIntegrity() {
  // Check if package.json exists and can be parsed
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  
  // Verify essential fields
  if (!packageJson.name || !packageJson.version) {
    throw new Error('Package.json missing essential fields');
  }
  
  // Verify required dependencies
  const requiredDeps = [
    'discord.js',
    'dotenv',
    'sqlite3'
  ];
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      throw new Error(`Required dependency ${dep} not found in package.json`);
    }
    
    // Check if the module can be imported
    try {
      require.resolve(dep);
    } catch (error) {
      throw new Error(`Cannot resolve module ${dep}. Is it installed?`);
    }
  }
}

async function testConfigFiles() {
  // Check if .env.sample exists
  if (!fs.existsSync('./.env.sample')) {
    throw new Error('.env.sample file not found');
  }
  
  // Check if environment variables are set
  if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV not set');
  }
}

// -------------------------
// Main test runner
// -------------------------

async function runTests() {
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`${colors.magenta}  KagamiMe Smoke Test${colors.reset}`);
  console.log(`${colors.magenta}======================================${colors.reset}`);
  
  logInfo(`Started at: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  // Run all tests
  await runTest('Build verification', testBuildVerification);
  await runTest('Package integrity', testPackageIntegrity);
  await runTest('Config files', testConfigFiles);
  await runTest('Database connection', testDatabaseConnection);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`${colors.magenta}  Test Summary${colors.reset}`);
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`Tests run: ${testsRun}`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsRun - testsPassed}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  
  // Determine final exit code
  if (testsPassed === testsRun) {
    console.log(`${colors.green}All tests passed! KagamiMe smoke test successful.${colors.reset}`);
    return 0;
  } else {
    console.error(`${colors.red}Some tests failed. Check the output above for details.${colors.reset}`);
    return 1;
  }
}

// Run the tests and exit with appropriate code
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error in test runner:${colors.reset}`, error);
    process.exit(1);
  });

