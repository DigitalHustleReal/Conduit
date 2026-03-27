'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const WEBHOOK_EVENTS = [
  'content.created', 'content.published', 'content.updated',
  'content.deleted', 'seo.scored', 'agent.completed',
];

interface Webhook {
  id: number;
  url: string;
  events: string[];
  enabled: boolean;
  lastTriggered: number | null;
  lastStatus: number | null;
}

interface WebhookLog {
  id: number;
  webhookId: number;
  event: string;
  status: number;
  ts: number;
  url: string;
}

export default function WebhooksPage() {
  const { settings } = useWorkspace();

  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: 1, url: 'https://api.example.com/webhook', events: ['content.published', 'content.updated'], enabled: true, lastTriggered: Date.now() - 3600000, lastStatus: 200 },
  ]);

  const [logs, setLogs] = useState<WebhookLog[]>([
    { id: 1, webhookId: 1, event: 'content.published', status: 200, ts: Date.now() - 3600000, url: 'https://api.example.com/webhook' },
    { id: 2, webhookId: 1, event: 'content.updated', status: 200, ts: Date.now() - 7200000, url: 'https://api.example.com/webhook' },
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function addWebhook() {
    if (!newUrl.trim() || selectedEvents.length === 0) return;
    const webhook: Webhook = {
      id: Date.now(),
      url: newUrl,
      events: selectedEvents,
      enabled: true,
      lastTriggered: null,
      lastStatus: null,
    };
    setWebhooks([...webhooks, webhook]);
    setNewUrl('');
    setSelectedEvents([]);
    setShowAdd(false);
  }

  function toggleWebhook(id: number) {
    setWebhooks(webhooks.map((w) => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }

  function removeWebhook(id: number) {
    setWebhooks(webhooks.filter((w) => w.id !== id));
  }

  function testWebhook(webhook: Webhook) {
    const log: WebhookLog = {
      id: Date.now(), webhookId: webhook.id, event: 'test.ping',
      status: 200, ts: Date.now(), url: webhook.url,
    };
    setLogs([log, ...logs]);
    setWebhooks(webhooks.map((w) => w.id === webhook.id ? { ...w, lastTriggered: Date.now(), lastStatus: 200 } : w));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Developer</p>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-sm text-muted-foreground mt-1">Receive HTTP callbacks when events happen in your workspace.</p>
      </div>

      {/* Webhook List */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Configured Webhooks ({webhooks.length})</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : 'Add Webhook'}</Button>
        </CardHeader>
        <CardContent>
          {showAdd && (
            <div className="p-4 rounded-lg bg-muted/50 mb-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Endpoint URL</label>
                <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Events</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <Badge
                      key={ev}
                      variant={selectedEvents.includes(ev) ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleEvent(ev)}
                    >
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedEvents.length === 0 && (
                <p className="text-xs text-amber-400">↑ Click events above to select them</p>
              )}
              <Button size="sm" onClick={addWebhook} disabled={!newUrl.trim() || selectedEvents.length === 0}>
                Create Webhook {selectedEvents.length > 0 ? `(${selectedEvents.length} events)` : ''}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.id} className="p-3 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="text-sm font-mono">{w.url}</div>
                  <div className="flex gap-1 mt-1">
                    {w.events.map((ev) => <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {w.lastTriggered ? `Last: ${new Date(w.lastTriggered).toLocaleString()}` : 'Never triggered'}
                    {w.lastStatus && <Badge variant="outline" className="ml-2 text-[10px]">{w.lastStatus}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => testWebhook(w)}>Test</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleWebhook(w.id)}>
                    {w.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => removeWebhook(w.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {webhooks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No webhooks configured. Add one to get started.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Deliveries</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.slice(0, 20).map((l) => (
              <div key={l.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={l.status < 300 ? 'default' : 'destructive'} className="text-[10px] w-12 justify-center">{l.status}</Badge>
                  <span className="font-mono text-xs">{l.event}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.ts).toLocaleString()}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">No deliveries yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
