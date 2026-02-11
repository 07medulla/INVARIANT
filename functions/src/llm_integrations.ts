import axios from 'axios';
import { getSecret } from './secrets_service';
import { LLMResponse } from './models';

export async function callGemini(prompt: string): Promise<LLMResponse> {
  const apiKey = await getSecret('GEMINI_API_KEY');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  const { data } = await axios.post(
    `${url}?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }]}] },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const output = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { model: 'Gemini', output };
}

export async function callPerplexity(prompt: string): Promise<LLMResponse> {
  const apiKey = await getSecret('PERPLEXITY_API_KEY');
  const { data } = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    { model: 'sonar-medium-chat', messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  const output = data?.choices?.[0]?.message?.content ?? '';
  return { model: 'Perplexity', output };
}

export async function callClaude(prompt: string): Promise<LLMResponse> {
  const apiKey = await getSecret('CLAUDE_API_KEY');
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
  const output = data?.content?.[0]?.text ?? '';
  return { model: 'Claude', output };
}
