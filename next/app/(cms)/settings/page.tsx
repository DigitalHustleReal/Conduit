'use client';

import { useState } from 'react';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

export default function SettingsPage() {
  const { siteName, settings, pricingPlan, credits, setSettings, setWorkspace, workspaceId, setPlan } = useWorkspace();
  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;

  const [localName, setLocalName] = useState(siteName);
  const [localNiche, setLocalNiche] = useState(settings.niche || '');
  const [localDomain, setLocalDomain] = useState(settings.siteDomain || '');
  const [localVercelHook, setLocalVercelHook] = useState(settings.vercelHook || '');
  const [localSupabaseUrl, setLocalSupabaseUrl] = useState(settings.supabaseUrl || '');

  const [apiKeys, setApiKeys] = useState({
    openai: settings.openaiKey || '',
    gemini: settings.geminiKey || '',
    mistral: settings.mistralKey || '',
    groq: settings.groqKey || '',
  });
  const [showKeys, setShowKeys] = useState({ openai: false, gemini: false, mistral: false, groq: false });

  const creditPct = Math.min((credits.aiCalls / limits.aiCalls) * 100, 100);
  const storagePct = Math.min((credits.storage / limits.storage) * 100, 100);

  function handleSave() {
    setWorkspace(workspaceId || 'default', localName);
    setSettings({
      niche: localNiche,
      siteDomain: localDomain,
      vercelHook: localVercelHook,
      supabaseUrl: localSupabaseUrl,
      openaiKey: apiKeys.openai,
      geminiKey: apiKeys.gemini,
      mistralKey: apiKeys.mistral,
      groqKey: apiKeys.groq,
    });
  }

  function handleExport() {
    const state = useWorkspace.getState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `conduit-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (confirm('This will erase all workspace data. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Account</p>
        <h1 className="text-2xl font-bold">Settings & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace, API keys, and subscription.</p>
      </div>

      {/* Workspace */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Workspace</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Site Name</label>
            <Input value={localName} onChange={(e) => setLocalName(e.target.value)} placeholder="My Content Site" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Niche</label>
              <Input value={localNiche} onChange={(e) => setLocalNiche(e.target.value)} placeholder="e.g. Personal Finance" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Domain</label>
              <Input value={localDomain} onChange={(e) => setLocalDomain(e.target.value)} placeholder="example.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Billing & Usage</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm">Current Plan:</span>
            <Badge variant={pricingPlan === 'free' ? 'secondary' : 'default'} className="capitalize">{pricingPlan}</Badge>
          </div>
          <div className="flex gap-2">
            {pricingPlan !== 'pro' && <Button size="sm" variant="outline" onClick={() => setPlan('pro')}>Upgrade to Pro ($29/mo)</Button>}
            {pricingPlan !== 'business' && <Button size="sm" onClick={() => setPlan('business')}>Upgrade to Business ($99/mo)</Button>}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI Credits</span>
              <span>{credits.aiCalls} / {limits.aiCalls}</span>
            </div>
            <Progress value={creditPct} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Storage</span>
              <span>{credits.storage} / {limits.storage} MB</span>
            </div>
            <Progress value={storagePct} />
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">API Keys (BYOK)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(['openai', 'gemini', 'mistral', 'groq'] as const).map((provider) => (
            <div key={provider} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-16 capitalize">{provider}</label>
              <Input
                type={showKeys[provider] ? 'text' : 'password'}
                value={apiKeys[provider]}
                onChange={(e) => setApiKeys({ ...apiKeys, [provider]: e.target.value })}
                placeholder={`${provider} API key`}
                className="flex-1"
              />
              <Button size="sm" variant="ghost" onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}>
                {showKeys[provider] ? 'Hide' : 'Show'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vercel Deploy Hook URL</label>
            <Input value={localVercelHook} onChange={(e) => setLocalVercelHook(e.target.value)} placeholder="https://api.vercel.com/v1/integrations/deploy/..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Supabase URL</label>
            <Input value={localSupabaseUrl} onChange={(e) => setLocalSupabaseUrl(e.target.value)} placeholder="https://xxx.supabase.co" />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="mb-4 border-red-500/20">
        <CardHeader><CardTitle className="text-sm text-red-400">Danger Zone</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>Export All Data</Button>
          <Button variant="destructive" size="sm" onClick={handleReset}>Reset Workspace</Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">Save Settings</Button>
    </div>
  );
}
