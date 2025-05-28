#!/usr/bin/env node

require('dotenv').config();
const OpenAI = require('openai');

// ASCII Art Banner
console.log(`
╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗
╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ 
╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝

        Made with 💜 by NullMeDev
        OpenAI API Test
`);

async function testOpenAI() {
    console.log('🔧 Testing OpenAI API...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`API Key: ${apiKey ? apiKey.substring(0, 12) + '...' + apiKey.slice(-4) : 'NOT FOUND'}`);
    console.log(`API Key starts with: ${apiKey ? apiKey.substring(0, 20) : 'N/A'}`);
    
    if (!apiKey) {
        console.log('❌ OpenAI API key not found in environment variables');
        return;
    }
    
    try {
        const openai = new OpenAI({
            apiKey: apiKey
        });
        
        console.log('\n📝 Testing simple completion...');
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Respond with exactly one word: 'WORKING'"
                },
                {
                    role: "user",
                    content: "Test"
                }
            ],
            max_tokens: 10,
            temperature: 0
        });
        
        console.log('  ✅ Success!');
        console.log(`  📊 Response: ${completion.choices[0].message.content}`);
        
    } catch (error) {
        console.log('  ❌ Error:', error.message);
        if (error.status) {
            console.log(`  📊 Status: ${error.status}`);
        }
    }
}

testOpenAI().then(() => {
    console.log('\n✅ OpenAI API test completed!');
    console.log('Made with 💜 by NullMeDev');
}).catch(console.error);
