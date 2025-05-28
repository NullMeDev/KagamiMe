// OpenAI Client Configuration for KagamiMe
// Made with 💜 by NullMeDev

import OpenAI from 'openai';

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
    if (!_openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        _openai = new OpenAI({ apiKey });
    }
    return _openai;
}

// Legacy export for backward compatibility
export const openai = {
    get chat() {
        return getOpenAI().chat;
    },
    get completions() {
        return getOpenAI().completions;
    }
};

export default openai;
