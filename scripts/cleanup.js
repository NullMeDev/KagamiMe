#!/usr/bin/env node

/**
 * This script removes OpenAI-related files and cleans up the codebase
 * after transitioning away from OpenAI dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to be removed
const filesToRemove = [
  // Source OpenAI client file
  'src/utils/openaiClient.ts',
  
  // Test files
  'test-openai-only.js',
  
  // Compiled files
  'dist/utils/openaiClient.js',
  'dist/utils/openaiClient.js.map',
  'dist/utils/openaiClient.d.ts',
  'dist/utils/openaiClient.d.ts.map',
];

// Update .gitignore with proper Node.js patterns
const gitignoreContent = `# Dependency directories
node_modules/
jspm_packages/

# Compiled output
dist/
build/
*.js.map

# Environment variables
.env
.env.local
.env.development
.env.test
.env.production

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Coverage directory
coverage/

# IDE and editor files
.idea/
.vscode/
*.swp
*.swo
.DS_Store
`;

// Counter for deleted files
let deletedCount = 0;

console.log('🧹 Starting KagamiMe cleanup process...');

// Remove files
filesToRemove.forEach(file => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
      deletedCount++;
    } catch (err) {
      console.error(`❌ Error removing ${file}: ${err.message}`);
    }
  } else {
    console.log(`⚠️ File not found (already removed): ${file}`);
  }
});

// Update .gitignore
try {
  fs.writeFileSync(path.resolve(process.cwd(), '.gitignore'), gitignoreContent);
  console.log('✅ Updated .gitignore with standard Node.js patterns');
} catch (err) {
  console.error(`❌ Error updating .gitignore: ${err.message}`);
}

// Clean npm cache (optional)
try {
  console.log('🧹 Cleaning npm cache...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
} catch (err) {
  console.error(`❌ Error cleaning npm cache: ${err.message}`);
}

// Rebuild node_modules without OpenAI (optional)
try {
  console.log('🔄 Rebuilding dependencies...');
  execSync('npm ci', { stdio: 'inherit' });
} catch (err) {
  console.error(`❌ Error rebuilding dependencies: ${err.message}`);
}

console.log(`\n🎉 Cleanup complete! Removed ${deletedCount} OpenAI-related files.`);
console.log('👉 You may want to run "npm run build" to regenerate dist files without OpenAI references.');

