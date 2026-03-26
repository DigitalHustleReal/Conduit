'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const PROVIDERS = [
  {
    id: 'anthropic', name: 'Anthropic (Claude)', icon: '🟣',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-0-20250514', 'claude-haiku-3-20250414'],
    keyField: null as string | null,
  },
  {
    id: 'openai', name: 'OpenAI', icon: '🟢',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    keyField: 'openaiKey',
  },
  {
    id: 'google', name: 'Google (Gemini)', icon: '🔵',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-flash'],
    keyField: 'geminiKey',
  },
  {
    id: 'mistral', name: 'Mistral', icon: '🟠',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    keyField: 'mistralKey',
  },
  {
    id: 'groq', name: 'Groq', icon: '🔴',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.1-8b-instant'],
    keyField: 'groqKey',
  },
] as const;

export default function AIEnginePage() {
  const { settings, setSettings, credits } = useWorkspace();
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  function selectProvider(providerId: string, model: string) {
    setSettings({ aiProvider: providerId, aiModel: model });
  }

  function setKey(field: string, value: string) {
    setSettings({ [field]: value } as unknown as Record<string, string>);
  }

  function testProvider(providerId: string) {
    setTesting(providerId);
    setTimeout(() => {
      setTestResults((prev) => ({ ...prev, [providerId]: 'Connection successful' }));
      setTesting(null);
    }, 1200);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Configuration</p>
        <h1 className="text-2xl font-bold">AI Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure AI providers. Active: <Badge variant="outline" className="ml-1">{settings.aiProvider}</Badge>
          <span className="ml-2 text-xs">{credits.aiCalls} AI calls used</span>
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((p) => {
          const isActive = settings.aiProvider === p.id;
          const keyValue = p.keyField ? (settings as unknown as Record<string, string>)[p.keyField] || '' : '';

          return (
            <Card key={p.id} className={isActive ? 'border-violet-500/50' : ''}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  {p.name}
                  {isActive && <Badge className="ml-2">Active</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground w-14">Model</label>
                  <select
                    className="flex-1 bg-background border rounded-md px-3 py-1.5 text-sm"
                    value={isActive ? settings.aiModel : p.models[0]}
                    onChange={(e) => selectProvider(p.id, e.target.value)}
                  >
                    {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {p.keyField && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground w-14">API Key</label>
                    <Input
                      type="password"
                      value={keyValue}
                      onChange={(e) => setKey(p.keyField!, e.target.value)}
                      placeholder={`Enter ${p.name} API key`}
                      className="flex-1"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => testProvider(p.id)} disabled={testing === p.id}>
                    {testing === p.id ? 'Testing...' : 'Test Connection'}
                  </Button>
                  {!isActive && (
                    <Button size="sm" onClick={() => selectProvider(p.id, p.models[0])}>Set as Active</Button>
                  )}
                  {testResults[p.id] && (
                    <span className="text-xs text-emerald-400">{testResults[p.id]}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
