"use strict";
// OpenAI Client Configuration for KagamiMe
// Made with 💜 by NullMeDev
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = void 0;
exports.getOpenAI = getOpenAI;
const openai_1 = __importDefault(require("openai"));
let _openai = null;
function getOpenAI() {
    if (!_openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        _openai = new openai_1.default({ apiKey });
    }
    return _openai;
}
// Legacy export for backward compatibility
exports.openai = {
    get chat() {
        return getOpenAI().chat;
    },
    get completions() {
        return getOpenAI().completions;
    }
};
exports.default = exports.openai;
//# sourceMappingURL=openaiClient.js.map