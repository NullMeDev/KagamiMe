#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

// ASCII Art Banner
console.log(`
╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗
╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ 
╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝

        Made with 💜 by NullMeDev
        ClaimBuster API Test
`);

async function testClaimBuster() {
    console.log('🔧 Testing ClaimBuster API...');
    
    const apiKey = process.env.CLAIMBUSTER_API_KEY;
    console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT FOUND'}`);
    
    if (!apiKey) {
        console.log('❌ ClaimBuster API key not found in environment variables');
        return;
    }
    
    // Test different endpoints that might work
    const endpoints = [
        'https://idir.uta.edu/claimbuster/api/v2/score/text',
        'https://idir.uta.edu/claimbuster/api/v1/score/text',
        'https://api.claimbuster.org/api/v2/score/text',
        'https://api.claimbuster.org/api/v1/score/text'
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\n📝 Testing endpoint: ${endpoint}`);
        try {
            const response = await axios.get(endpoint, {
                params: {
                    input_text: 'The Earth is round',
                    api_key: apiKey
                },
                timeout: 10000
            });
            
            console.log('  ✅ Success!');
            console.log(`  📊 Status: ${response.status}`);
            console.log(`  📊 Response:`, JSON.stringify(response.data, null, 2));
            return; // Found working endpoint
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.response?.status || error.code} - ${error.message}`);
            if (error.response?.data) {
                console.log(`  📊 Response data:`, error.response.data.substring(0, 200) + '...');
            }
        }
    }
    
    console.log('\n🔍 No working endpoints found. This API may require different authentication or be unavailable.');
}

testClaimBuster().then(() => {
    console.log('\n✅ ClaimBuster API test completed!');
    console.log('Made with 💜 by NullMeDev');
}).catch(console.error);
