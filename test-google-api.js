#!/usr/bin/env node

// Quick Google Fact Check API Test
// Tests just the Google API to verify setup
// Made with 💜 by NullMeDev

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ASCII Art
console.log('\x1b[35m');
console.log('╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗');
console.log('╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ ');
console.log('╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝');
console.log('\x1b[0m');
console.log('\x1b[35m        Made with 💜 by NullMeDev\x1b[0m');
console.log('\x1b[36m        Google Fact Check API Test\x1b[0m');
console.log('');

async function testGoogleAPI() {
    const apiKey = process.env.GOOGLE_FACTCHECK_API_KEY;
    
    if (!apiKey) {
        console.log('\x1b[31m❌ GOOGLE_FACTCHECK_API_KEY not found in environment\x1b[0m');
        console.log('Please add your Google API key to your .env file:');
        console.log('GOOGLE_FACTCHECK_API_KEY=your_api_key_here');
        return;
    }
    
    if (apiKey.startsWith('test-')) {
        console.log('\x1b[33m⚠️  Using test API key - this will fail\x1b[0m');
        console.log('Please replace with your real Google API key from:');
        console.log('https://console.cloud.google.com/');
        console.log('');
    }
    
    console.log('\x1b[33m🔧 Testing Google Fact Check API...\x1b[0m');
    console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    
    const testQueries = [
        'climate change',
        'vaccines cause autism',
        'earth is flat'
    ];
    
    for (const query of testQueries) {
        console.log(`\n\x1b[36m📝 Testing query: "${query}"\x1b[0m`);
        
        try {
            const response = await axios.get('https://factchecktools.googleapis.com/v1alpha1/claims:search', {
                params: {
                    query: query,
                    key: apiKey,
                    languageCode: 'en'
                },
                timeout: 10000
            });
            
            console.log(`  \x1b[32m✅ Success! Status: ${response.status}\x1b[0m`);
            console.log(`  📊 Claims found: ${response.data?.claims?.length || 0}`);
            
            if (response.data?.claims?.length > 0) {
                const firstClaim = response.data.claims[0];
                console.log(`  📝 First claim: "${firstClaim.text?.substring(0, 50)}..."`);
                
                if (firstClaim.claimReview && firstClaim.claimReview.length > 0) {
                    const review = firstClaim.claimReview[0];
                    console.log(`  🏛️  Publisher: ${review.publisher?.name || 'Unknown'}`);
                    console.log(`  📊 Rating: ${review.textualRating || 'No rating'}`);
                    console.log(`  🔗 URL: ${review.url?.substring(0, 50)}...` || 'No URL');
                }
            }
            
        } catch (error) {
            console.log(`  \x1b[31m❌ Error: ${error.response?.status || 'Network'} - ${error.response?.statusText || error.message}\x1b[0m`);
            
            if (error.response?.status === 403) {
                console.log('  💡 Possible solutions:');
                console.log('    - Enable Fact Check Tools API in Google Cloud Console');
                console.log('    - Check API key restrictions');
                console.log('    - Verify billing is enabled (if required)');
            } else if (error.response?.status === 400) {
                console.log('  💡 Possible solutions:');
                console.log('    - Check API key format');
                console.log('    - Verify request parameters');
            } else if (error.response?.status === 429) {
                console.log('  💡 Rate limited - wait and try again');
            }
            
            if (error.response?.data) {
                console.log(`  📄 Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n\x1b[32m✅ Google API test completed!\x1b[0m');
    console.log('\x1b[35mMade with 💜 by NullMeDev\x1b[0m');
}

// Run the test
testGoogleAPI().catch(error => {
    console.error('\x1b[31m❌ Test failed:', error.message, '\x1b[0m');
    process.exit(1);
});
