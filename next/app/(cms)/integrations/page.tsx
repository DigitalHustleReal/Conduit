'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Integration {
  id: string;
  name: string;
  icon: string;
  desc: string;
  category: string;
  configKey?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: 'wordpress', name: 'WordPress', icon: 'W', desc: 'Publish content directly to your WordPress site via REST API', category: 'CMS' },
  { id: 'gsc', name: 'Google Search Console', icon: 'G', desc: 'Import real ranking data, clicks, and impressions', category: 'Analytics' },
  { id: 'ga', name: 'Google Analytics', icon: 'GA', desc: 'Track page views, engagement, and conversions', category: 'Analytics' },
  { id: 'slack', name: 'Slack', icon: 'S', desc: 'Get notifications when content is published or agents run', category: 'Notifications' },
  { id: 'twitter', name: 'Twitter / X', icon: 'X', desc: 'Auto-post content summaries and threads on publish', category: 'Social' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', desc: 'Share articles to your LinkedIn profile or company page', category: 'Social' },
  { id: 'buffer', name: 'Buffer', icon: 'B', desc: 'Schedule social media posts across all platforms', category: 'Social' },
  { id: 'zapier', name: 'Zapier', icon: 'Z', desc: 'Connect Conduit to 5,000+ apps with custom workflows', category: 'Automation' },
  { id: 'vercel', name: 'Vercel', icon: 'V', desc: 'Trigger deployments when content is published', category: 'Hosting', configKey: 'vercelHook' },
];

export default function IntegrationsPage() {
  const { settings, setSettings } = useWorkspace();
  const [connected, setConnected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const i of INTEGRATIONS) {
      if (i.configKey && (settings as unknown as Record<string, unknown>)[i.configKey]) {
        init[i.id] = true;
      }
      if (settings.integrations[i.id]) {
        init[i.id] = true;
      }
    }
    return init;
  });
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [configValue, setConfigValue] = useState('');

  function handleConnect(id: string) {
    setConfiguring(id);
    setConfigValue('');
  }

  function handleSave(id: string) {
    const integration = INTEGRATIONS.find((i) => i.id === id);
    if (integration?.configKey) {
      setSettings({ [integration.configKey]: configValue } as Record<string, string>);
    } else {
      setSettings({ integrations: { ...settings.integrations, [id]: { connected: true, key: configValue } } });
    }
    setConnected({ ...connected, [id]: true });
    setConfiguring(null);
  }

  function handleDisconnect(id: string) {
    const integration = INTEGRATIONS.find((i) => i.id === id);
    if (integration?.configKey) {
      setSettings({ [integration.configKey]: '' } as Record<string, string>);
    } else {
      const next = { ...settings.integrations };
      delete next[id];
      setSettings({ integrations: next });
    }
    setConnected({ ...connected, [id]: false });
  }

  const categories = [...new Set(INTEGRATIONS.map((i) => i.category))];
  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Developer</p>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {connectedCount} of {INTEGRATIONS.length} integrations connected
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">{cat}</h2>
          <div className="grid grid-cols-3 gap-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((intg) => {
              const isConnected = connected[intg.id];
              return (
                <Card key={intg.id} className={`bg-card ${isConnected ? 'border-emerald-500/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">
                        {intg.icon}
                      </div>
                      <Badge variant={isConnected ? 'default' : 'secondary'} className="text-[9px]">
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{intg.name}</h3>
                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{intg.desc}</p>

                    {configuring === intg.id ? (
                      <div className="space-y-2">
                        <Input placeholder={`Enter ${intg.name} API key or webhook URL`} value={configValue}
                          onChange={(e) => setConfigValue(e.target.value)} className="text-xs" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(intg.id)} disabled={!configValue.trim()} className="flex-1">Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setConfiguring(null)} className="flex-1">Cancel</Button>
                        </div>
                      </div>
                    ) : isConnected ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleConnect(intg.id)} className="flex-1">Configure</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDisconnect(intg.id)} className="text-red-400 text-xs">Disconnect</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleConnect(intg.id)} className="w-full">Connect</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
