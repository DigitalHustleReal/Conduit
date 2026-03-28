import { AI_PROVIDERS } from './providers';

interface CallAIOptions {
  provider?: string;
  model?: string;
  maxTokens?: number;
  system?: string;
  session?: { access_token: string } | null;
  /** Pass previous messages for multi-turn conversation */
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  /** When true, streams chunks via onChunk and returns the full accumulated text */
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

export async function callAI(
  prompt: string,
  options: CallAIOptions = {},
  settings: Record<string, string> = {},
  apiKey?: string
): Promise<string> {
  const provider = options.provider || settings.aiProvider || 'anthropic';
  const model = options.model || settings.aiModel || 'claude-sonnet-4-20250514';
  const maxTok = options.maxTokens || 1600;
  const system = options.system || 'You are an expert AI assistant. Be direct, specific, and actionable.';

  const prov = AI_PROVIDERS[provider];
  const key = apiKey || prov?.getApiKey(settings);

  // Strategy:
  // 1. If user has BYOK key → call provider directly (free for them)
  // 2. If user has session → call /api/ai-proxy (uses platform key, tracks credits)
  // 3. If neither but we're on the platform → try proxy anyway (it has ANTHROPIC_API_KEY server-side)
  // 4. Only fail if truly nothing works
  const useProxy = !key && provider === 'anthropic'; // no personal key → use platform proxy

  if (!key && !useProxy) {
    throw new Error(`No API key for ${prov?.name || provider}. Go to Settings > AI Engine to add your key.`);
  }

  // Build messages array — support multi-turn via options.messages or single prompt
  const userMessages = options.messages
    ? [...options.messages, { role: 'user' as const, content: prompt }]
    : [{ role: 'user' as const, content: prompt }];

  let responseText = '';

  if (provider === 'anthropic') {
    const reqBody = {
      model,
      max_tokens: maxTok,
      system,
      messages: userMessages.filter((m) => m.role !== 'system'),
      ...(options.stream ? { stream: true } : {}),
    };

    let r: Response;
    if (useProxy) {
      // Use platform AI proxy — has ANTHROPIC_API_KEY server-side
      // Works even without user session (free tier uses platform credits)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (options.session?.access_token) {
        headers['Authorization'] = `Bearer ${options.session.access_token}`;
      }
      r = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
      });
    } else {
      // BYOK — user's own API key, call Anthropic directly
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key!,
          'anthropic-version': '2023-06-01',
          ...(options.stream ? { Accept: 'text/event-stream' } : {}),
        },
        body: JSON.stringify(reqBody),
      });
    }

    if (!r.ok) {
      const errText = await r.text().catch(() => r.statusText);
      throw new Error(`HTTP ${r.status}: ${errText.slice(0, 200)}`);
    }

    if (options.stream && r.body) {
      responseText = await readSSEStream(r.body, 'anthropic', options.onChunk);
    } else {
      const d = await r.json();
      if (d.error) throw new Error(d.error.message || d.error);
      responseText = d.content?.[0]?.text || '';
    }

  } else if (provider === 'openai') {
    const msgs = [{ role: 'system', content: system }, ...userMessages.filter((m) => m.role !== 'system')];
    const reqBody = {
      model,
      max_tokens: maxTok,
      messages: msgs,
      ...(options.stream ? { stream: true } : {}),
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(reqBody),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => r.statusText);
      throw new Error(`OpenAI HTTP ${r.status}: ${errText.slice(0, 200)}`);
    }
    if (options.stream && r.body) {
      responseText = await readSSEStream(r.body, 'openai', options.onChunk);
    } else {
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      responseText = d.choices?.[0]?.message?.content || '';
    }

  } else if (provider === 'gemini') {
    // Gemini doesn't support SSE streaming in the same way; use non-streaming
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: userMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.role === 'system' ? `${system}\n\n${m.content}` : m.content }],
        })),
        generationConfig: { maxOutputTokens: maxTok },
      }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => r.statusText);
      throw new Error(`Gemini HTTP ${r.status}: ${errText.slice(0, 200)}`);
    }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || d.error.status);
    responseText = d.candidates?.[0]?.content?.parts?.[0]?.text || '';

  } else if (provider === 'mistral') {
    const msgs = [{ role: 'system', content: system }, ...userMessages.filter((m) => m.role !== 'system')];
    const reqBody = {
      model,
      max_tokens: maxTok,
      messages: msgs,
      ...(options.stream ? { stream: true } : {}),
    };
    const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(reqBody),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => r.statusText);
      throw new Error(`Mistral HTTP ${r.status}: ${errText.slice(0, 200)}`);
    }
    if (options.stream && r.body) {
      responseText = await readSSEStream(r.body, 'openai', options.onChunk);
    } else {
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      responseText = d.choices?.[0]?.message?.content || '';
    }

  } else if (provider === 'groq') {
    const msgs = [{ role: 'system', content: system }, ...userMessages.filter((m) => m.role !== 'system')];
    const reqBody = {
      model,
      max_tokens: maxTok,
      messages: msgs,
      ...(options.stream ? { stream: true } : {}),
    };
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(reqBody),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => r.statusText);
      throw new Error(`Groq HTTP ${r.status}: ${errText.slice(0, 200)}`);
    }
    if (options.stream && r.body) {
      responseText = await readSSEStream(r.body, 'openai', options.onChunk);
    } else {
      const d = await r.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      responseText = d.choices?.[0]?.message?.content || '';
    }
  }

  return responseText;
}

/**
 * Read an SSE (Server-Sent Events) stream and extract text deltas.
 * Supports Anthropic and OpenAI-compatible (OpenAI/Mistral/Groq) formats.
 */
async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  format: 'anthropic' | 'openai',
  onChunk?: (chunk: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep incomplete last line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          let delta = '';

          if (format === 'anthropic') {
            // Anthropic: content_block_delta events
            if (parsed.type === 'content_block_delta') {
              delta = parsed.delta?.text || '';
            }
          } else {
            // OpenAI-compatible: choices[0].delta.content
            delta = parsed.choices?.[0]?.delta?.content || '';
          }

          if (delta) {
            accumulated += delta;
            onChunk?.(delta);
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}
