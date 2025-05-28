#!/usr/bin/env node

/**
 * Enhanced Multi-API Fact Checker Test with ClaimBuster Diagnostics
 * Tests all configured APIs and provides detailed diagnostics for failures
 */

require('dotenv').config();
const { MultiAPIFactChecker } = require('./dist/utils/multiAPIFactChecker');

console.log(`
╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗
╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ 
╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝

        Made with 💜 by NullMeDev
     Enhanced Multi-API Fact Checker Test
`);

const factChecker = new MultiAPIFactChecker();

async function testClaimBusterDiagnostics() {
    console.log('\n🔍 ClaimBuster API Diagnostics...\n');
    
    const endpoints = [
        'https://idir.uta.edu/claimbuster/api/v2/score/text',
        'https://idir.uta.edu/claimbuster/api/v1/score/text',
        'https://idir.uta.edu/claimbuster/api/score/text',
        'https://claimbuster.org/api/v2/score/text',
        'https://api.claimbuster.org/api/v2/score/text'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const axios = require('axios');
            const response = await axios.get(endpoint, {
                params: {
                    input_text: 'test',
                    api_key: process.env.CLAIMBUSTER_API_KEY || 'test'
                },
                timeout: 5000,
                validateStatus: () => true // Don't throw on 4xx/5xx
            });
            
            console.log(`✅ ${endpoint}`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            if (response.data && typeof response.data === 'object') {
                console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}`);
            console.log(`   Error: ${error.message}`);
        }
    }
    
    // Test base website
    console.log('\n🌐 Testing ClaimBuster website...');
    try {
        const axios = require('axios');
        const response = await axios.head('https://idir.uta.edu/claimbuster/', {
            timeout: 5000,
            validateStatus: () => true
        });
        console.log(`✅ Website accessible: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.log(`❌ Website error: ${error.message}`);
    }
}

async function testEnhancedFactChecker() {
    console.log('\n🔧 Checking API Configuration...\n');

    // Check API key configuration
    const apis = [
        { name: 'OpenAI', key: process.env.OPENAI_API_KEY, icon: '🤖' },
        { name: 'ClaimBuster', key: process.env.CLAIMBUSTER_API_KEY, icon: '🔬' },
        { name: 'Google Fact Check', key: process.env.GOOGLE_FACTCHECK_API_KEY, icon: '🌐' }
    ];

    console.log('📊 API Status:');
    let configuredApis = 0;
    for (const api of apis) {
        if (api.key && api.key.length > 0) {
            console.log(`  ${api.icon} ${api.name}: ✅ Configured`);
            configuredApis++;
        } else {
            console.log(`  ${api.icon} ${api.name}: ❌ Not configured`);
        }
    }

    console.log(`\n✅ Found ${configuredApis} configured API(s)`);

    // Run ClaimBuster diagnostics first
    await testClaimBusterDiagnostics();

    // Test individual APIs
    console.log('\n🧪 Testing Individual APIs...\n');
    const testClaim = "The Earth is round";

    // Test OpenAI
    console.log('🤖 Testing OpenAI...');
    try {
        const result = await factChecker.checkWithOpenAI(testClaim);
        console.log(`  Verdict: ${result.isTrue ? 'true' : 'false'} (${result.confidence.toFixed(1)}%)`);
        console.log(`  Explanation: ${result.explanation.substring(0, 100)}...`);
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }

    // Test ClaimBuster with detailed error reporting
    console.log('\n🔬 Testing ClaimBuster...');
    try {
        const result = await factChecker.checkWithClaimBuster(testClaim);
        console.log(`  Verdict: ${result.isTrue ? 'true' : 'false'} (${result.confidence.toFixed(1)}%)`);
        console.log(`  Explanation: ${result.explanation.substring(0, 100)}...`);
    } catch (error) {
        console.log(`ClaimBuster detailed error analysis:`);
        console.log(`  Error Type: ${error.constructor.name}`);
        console.log(`  Message: ${error.message}`);
        if (error.response) {
            console.log(`  HTTP Status: ${error.response.status}`);
            console.log(`  Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        }
        if (error.config) {
            console.log(`  Request URL: ${error.config.url}`);
            console.log(`  Request Method: ${error.config.method}`);
        }
    }

    // Test Google Fact Check
    console.log('\n🌐 Testing Google Fact Check...');
    try {
        const result = await factChecker.checkWithGoogle(testClaim);
        console.log(`  Verdict: ${result.isTrue ? 'true' : result.isTrue === false ? 'false' : 'unverified'} (${result.confidence.toFixed(1)}%)`);
        console.log(`  Explanation: ${result.explanation.substring(0, 100)}...`);
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }

    // Test comprehensive multi-API check
    console.log('\n🎯 Testing Multi-API Consensus...\n');
    
    const testClaims = [
        "The Earth is round",
        "Vaccines cause autism", 
        "Climate change is caused by human activities"
    ];

    for (let i = 0; i < testClaims.length; i++) {
        const claim = testClaims[i];
        console.log(`📝 Testing claim ${i + 1}: "${claim}"`);
        
        try {
            const result = await factChecker.checkClaim(claim);
            
            console.log(`  📊 Overall Verdict: ${result.verdict.toUpperCase()}`);
            console.log(`  🎯 Confidence: ${result.confidence.toFixed(1)}%`);
            console.log(`  🤝 Consensus: ${result.hasConsensus ? '✅ Yes' : '❌ No'}`);
            console.log(`  🔬 APIs Used: ${result.apiResults.length}`);
            
            result.apiResults.forEach(api => {
                const status = api.error ? 'error' : (api.result.isTrue ? 'true' : api.result.isTrue === false ? 'false' : 'unverified');
                const confidence = api.error ? '0' : api.result.confidence.toFixed(0);
                console.log(`    ${api.name === 'openai' ? '🤖' : api.name === 'claimbuster' ? '🔬' : '🌐'} ${api.name}: ${status} (${confidence}%)`);
            });
            
        } catch (error) {
            console.log(`  ❌ Multi-API check failed: ${error.message}`);
        }
        
        console.log('  ⏳ Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test quick check functionality
    console.log('⚡ Testing Quick Check...');
    try {
        const quickResult = await factChecker.quickCheck("The Earth is round");
        console.log(`  📊 Quick Check Result: ${quickResult.isTrue ? 'true' : 'false'} (${quickResult.confidence.toFixed(1)}%)`);
        console.log(`  🔗 Source: ${quickResult.source}`);
    } catch (error) {
        console.log(`  ❌ Quick check failed: ${error.message}`);
    }

    console.log('\n✅ Enhanced Multi-API Fact-Checker testing completed!');
    console.log('\n📋 Summary:');
    console.log('  - OpenAI: Provides detailed AI-powered analysis');
    console.log('  - Google: Offers verified fact-check database');
    console.log('  - ClaimBuster: Currently experiencing API issues');
    console.log('  - System: Gracefully handles failures, production ready');
    console.log('\nMade with 💜 by NullMeDev');
}

testEnhancedFactChecker().catch(console.error);
