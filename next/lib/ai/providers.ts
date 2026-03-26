export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  models: Array<{ id: string; name: string; context: string }>;
  getApiKey: (settings: Record<string, string>) => string;
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🟣',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', context: '200K' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', context: '200K' },
      { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', context: '200K' },
    ],
    getApiKey: (s) => s.apiKey || '',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', context: '128K' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128K' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: '128K' },
    ],
    getApiKey: (s) => s.openaiKey || '',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '🔵',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: '1M' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: '1M' },
    ],
    getApiKey: (s) => s.geminiKey || '',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    icon: '🟠',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', context: '128K' },
      { id: 'mistral-small-latest', name: 'Mistral Small', context: '128K' },
    ],
    getApiKey: (s) => s.mistralKey || '',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', context: '128K' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', context: '128K' },
    ],
    getApiKey: (s) => s.groqKey || '',
  },
};

export function getProviderList() {
  return Object.values(AI_PROVIDERS);
}
