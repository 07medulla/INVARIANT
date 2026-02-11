import { Env } from './index';
import axios from 'axios';

export function buildLlmClients(env: Env) {
  return {
    varClient: async (prompt: string) => {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) return 'GEMINI_API_KEY missing';
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      const { data } = await axios.post(
        `${url}?key=${apiKey}`,
        { contents: [{ parts: [{ text: prompt }]}] },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
    truthClient: async (prompt: string) => {
      const apiKey = env.PERPLEXITY_API_KEY;
      if (!apiKey) return 'PERPLEXITY_API_KEY missing';
      const { data } = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        { model: 'sonar-medium-chat', messages: [{ role: 'user', content: prompt }] },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );
      return data?.choices?.[0]?.message?.content ?? '';
    },
    executionClient: async (prompt: string) => {
      const apiKey = env.CLAUDE_API_KEY;
      if (!apiKey) return 'CLAUDE_API_KEY missing';
      const { data } = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: 'claude-3-sonnet-20240229', max_tokens: 400, messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );
      return data?.content?.[0]?.text ?? '';
    }
  };
}
