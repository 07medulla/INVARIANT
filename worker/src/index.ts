import { handleInvariantEnvelope } from '../../functions/src/orchestration';
import { invariantPipeline, fluidintelExecute } from './runtime';
import { buildLlmClients } from './llmClients';

export interface Env {
  GEMINI_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  GEOMETRY_VERSION: string;
}

async function jsonResponse(status: number, body: unknown): Promise<Response> {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    const payload = await request.json().catch(() => null);

    if (url.pathname === '/pipeline') {
      return jsonResponse(200, await invariantPipeline(payload));
    }

    if (url.pathname === '/fluidintel') {
      return jsonResponse(200, await fluidintelExecute(payload));
    }

    if (url.pathname === '/envelope') {
      const llms = buildLlmClients(env);
      const result = await handleInvariantEnvelope(payload, {
        geometryVersion: env.GEOMETRY_VERSION,
        llms
      });
      return jsonResponse(result.statusCode, result.payload);
    }

    return jsonResponse(404, { error: 'Not found' });
  }
};
