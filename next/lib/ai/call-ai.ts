import { AI_PROVIDERS } from './providers';

interface CallAIOptions {
  provider?: string;
  model?: string;
  maxTokens?: number;
  system?: string;
  session?: { access_token: string } | null;
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

  if (!key && !options.session) {
    throw new Error(`No API key for ${prov?.name || provider}. Go to AI Engine to add your key.`);
  }

  let responseText = '';

  if (provider === 'anthropic') {
    const reqBody = { model, max_tokens: maxTok, system, messages: [{ role: 'user', content: prompt }] };

    // Route through backend proxy if session exists and no personal key
    let r: Response;
    if (options.session && !key) {
      r = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.session.access_token}` },
        body: JSON.stringify(reqBody),
      });
    } else {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(reqBody),
      });
    }
    if (!r.ok) { const errText = await r.text().catch(() => r.statusText); throw new Error(`HTTP ${r.status}: ${errText.slice(0, 200)}`); }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || d.error);
    responseText = d.content?.[0]?.text || '';

  } else if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    });
    if (!r.ok) { const errText = await r.text().catch(() => r.statusText); throw new Error(`OpenAI HTTP ${r.status}: ${errText.slice(0, 200)}`); }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    responseText = d.choices?.[0]?.message?.content || '';

  } else if (provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}` }] }], generationConfig: { maxOutputTokens: maxTok } }),
    });
    if (!r.ok) { const errText = await r.text().catch(() => r.statusText); throw new Error(`Gemini HTTP ${r.status}: ${errText.slice(0, 200)}`); }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || d.error.status);
    responseText = d.candidates?.[0]?.content?.parts?.[0]?.text || '';

  } else if (provider === 'mistral') {
    const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    });
    if (!r.ok) { const errText = await r.text().catch(() => r.statusText); throw new Error(`Mistral HTTP ${r.status}: ${errText.slice(0, 200)}`); }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    responseText = d.choices?.[0]?.message?.content || '';

  } else if (provider === 'groq') {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: maxTok, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    });
    if (!r.ok) { const errText = await r.text().catch(() => r.statusText); throw new Error(`Groq HTTP ${r.status}: ${errText.slice(0, 200)}`); }
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
    responseText = d.choices?.[0]?.message?.content || '';
  }

  return responseText;
}
