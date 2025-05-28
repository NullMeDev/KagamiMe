#!/usr/bin/env node

// Test script for KagamiMe Multi-API Fact Checker
// Tests OpenAI, ClaimBuster, and Google Fact Check APIs
// Made with 💜 by NullMeDev

const { MultiAPIFactChecker } = require('./dist/utils/multiAPIFactChecker.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });

// Test claims
const testClaims = [
    "The Earth is round",
    "Vaccines cause autism",
    "Climate change is caused by human activities",
    "The Moon landing was faked",
    "Water boils at 100 degrees Celsius at sea level"
];

// ASCII Art
console.log('\x1b[35m');
console.log('╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗');
console.log('╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ ');
console.log('╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝');
console.log('\x1b[0m');
console.log('\x1b[35m        Made with 💜 by NullMeDev\x1b[0m');
console.log('\x1b[36m        The best fake-news fighter (鏡眼)\x1b[0m');
console.log('');

async function testMultiAPIFactChecker() {
    const factChecker = new MultiAPIFactChecker();
    
    // Check API configuration
    console.log('\x1b[33m🔧 Checking API Configuration...\x1b[0m');
    const apiStatus = factChecker.getAPIStatus();
    
    console.log('\n📊 API Status:');
    console.log(`  🤖 OpenAI: ${apiStatus.openai ? '\x1b[32m✅ Configured\x1b[0m' : '\x1b[31m❌ Not configured\x1b[0m'}`);
    console.log(`  🔬 ClaimBuster: ${apiStatus.claimbuster ? '\x1b[32m✅ Configured\x1b[0m' : '\x1b[31m❌ Not configured\x1b[0m'}`);
    console.log(`  🌐 Google Fact Check: ${apiStatus.google ? '\x1b[32m✅ Configured\x1b[0m' : '\x1b[31m❌ Not configured\x1b[0m'}`);
    
    const enabledAPIs = Object.entries(apiStatus).filter(([, enabled]) => enabled);
    
    if (enabledAPIs.length === 0) {
        console.log('\n\x1b[31m❌ No APIs are configured. Please check your .env file.\x1b[0m');
        console.log('\nRequired environment variables:');
        console.log('  - OPENAI_API_KEY');
        console.log('  - CLAIMBUSTER_API_KEY');
        console.log('  - GOOGLE_FACTCHECK_API_KEY');
        return;
    }
    
    console.log(`\n\x1b[32m✅ Found ${enabledAPIs.length} configured API(s)\x1b[0m`);
    
    // Test individual APIs if available
    console.log('\n\x1b[33m🧪 Testing Individual APIs...\x1b[0m');
    
    const testClaim = "The Earth is round";
    
    if (apiStatus.openai) {
        console.log('\n\x1b[36m🤖 Testing OpenAI...\x1b[0m');
        try {
            const result = await factChecker.checkWithOpenAI(testClaim);
            console.log(`  Verdict: ${result.verdict} (${(result.confidence * 100).toFixed(1)}%)`);
            console.log(`  Explanation: ${result.explanation.substring(0, 100)}...`);
        } catch (error) {
            console.log(`  \x1b[31m❌ Error: ${error.message}\x1b[0m`);
        }
    }
    
    if (apiStatus.claimbuster) {
        console.log('\n\x1b[36m🔬 Testing ClaimBuster...\x1b[0m');
        try {
            const result = await factChecker.checkWithClaimBuster(testClaim);
            console.log(`  Verdict: ${result.verdict} (${(result.confidence * 100).toFixed(1)}%)`);
            console.log(`  Explanation: ${result.explanation.substring(0, 100)}...`);
        } catch (error) {
            console.log(`  \x1b[31m❌ Error: ${error.message}\x1b[0m`);
        }
    }
    
    if (apiStatus.google) {
        console.log('\n\x1b[36m🌐 Testing Google Fact Check...\x1b[0m');
        try {
            const result = await factChecker.checkWithGoogle(testClaim);
            console.log(`  Verdict: ${result.verdict} (${(result.confidence * 100).toFixed(1)}%)`);
            console.log(`  Explanation: ${result.explanation.substring(0, 100)}...`);
        } catch (error) {
            console.log(`  \x1b[31m❌ Error: ${error.message}\x1b[0m`);
        }
    }
    
    // Test multi-API consensus
    console.log('\n\x1b[33m🎯 Testing Multi-API Consensus...\x1b[0m');
    
    for (let i = 0; i < Math.min(3, testClaims.length); i++) {
        const claim = testClaims[i];
        console.log(`\n\x1b[36m📝 Testing claim ${i + 1}: "${claim}"\x1b[0m`);
        
        try {
            const result = await factChecker.checkClaim(claim);
            
            console.log(`  📊 Overall Verdict: \x1b[1m${result.overall_verdict.toUpperCase()}\x1b[0m`);
            console.log(`  🎯 Confidence: ${(result.confidence_score * 100).toFixed(1)}%`);
            console.log(`  🤝 Consensus: ${result.consensus ? '✅ Yes' : '❌ No'}`);
            console.log(`  🔬 APIs Used: ${result.results.length}`);
            
            result.results.forEach(apiResult => {
                const icon = apiResult.source === 'openai' ? '🤖' : 
                           apiResult.source === 'claimbuster' ? '🔬' : 
                           apiResult.source === 'google' ? '🌐' : '❓';
                console.log(`    ${icon} ${apiResult.source}: ${apiResult.verdict} (${(apiResult.confidence * 100).toFixed(0)}%)`);
            });
            
        } catch (error) {
            console.log(`  \x1b[31m❌ Error: ${error.message}\x1b[0m`);
        }
        
        // Add delay between requests to respect API limits
        if (i < testClaims.length - 1) {
            console.log('  ⏳ Waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Test quick check
    console.log('\n\x1b[33m⚡ Testing Quick Check...\x1b[0m');
    try {
        const quickResult = await factChecker.quickCheck("Water freezes at 0 degrees Celsius");
        console.log(`  📊 Quick Check Result: ${quickResult.verdict} (${(quickResult.confidence * 100).toFixed(1)}%)`);
        console.log(`  🔗 Source: ${quickResult.source}`);
    } catch (error) {
        console.log(`  \x1b[31m❌ Quick check error: ${error.message}\x1b[0m`);
    }
    
    console.log('\n\x1b[32m✅ Multi-API Fact-Checker testing completed!\x1b[0m');
    console.log('\x1b[35mMade with 💜 by NullMeDev\x1b[0m');
}

// Run the test
testMultiAPIFactChecker().catch(error => {
    console.error('\x1b[31m❌ Test failed:', error.message, '\x1b[0m');
    process.exit(1);
});
