'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TRIGGERS = [
  { value: 'content_created', label: 'Content Created', icon: '📝' },
  { value: 'content_published', label: 'Content Published', icon: '🚀' },
  { value: 'seo_below_60', label: 'SEO Score Below 60', icon: '⚠️' },
  { value: 'keyword_added', label: 'Keyword Added', icon: '🔑' },
  { value: 'scheduled_time', label: 'Scheduled Time', icon: '⏰' },
  { value: 'agent_completed', label: 'Agent Completed', icon: '🤖' },
  { value: 'content_updated', label: 'Content Updated', icon: '✏️' },
  { value: 'manual', label: 'Manual Trigger', icon: '👆' },
  { value: 'webhook_received', label: 'Webhook Received', icon: '🌐' },
];

const ACTIONS = [
  { value: 'run_seo_audit', label: 'Run SEO Audit', icon: '🔍' },
  { value: 'generate_social', label: 'Generate Social Posts', icon: '📢' },
  { value: 'notify_team', label: 'Notify Team', icon: '🔔' },
  { value: 'update_pipeline', label: 'Update Pipeline', icon: '📦' },
  { value: 'run_agent', label: 'Run Agent', icon: '🤖' },
  { value: 'send_webhook', label: 'Send Webhook', icon: '🌐' },
  { value: 'auto_interlink', label: 'Auto Interlink', icon: '🔗' },
  { value: 'generate_schema', label: 'Generate Schema', icon: '🧩' },
];

interface AutomationLog { trigger: string; action: string; ts: number; status: 'success' | 'failed' }

export default function AutomationsPage() {
  const { automations } = useWorkspace();
  const [showAdd, setShowAdd] = useState(false);
  const [newTrigger, setNewTrigger] = useState(TRIGGERS[0].value);
  const [newAction, setNewAction] = useState(ACTIONS[0].value);
  const [localRules, setLocalRules] = useState(automations);
  const [logs] = useState<AutomationLog[]>([
    { trigger: 'content_published', action: 'generate_social', ts: Date.now() - 3600000, status: 'success' },
    { trigger: 'seo_below_60', action: 'run_seo_audit', ts: Date.now() - 7200000, status: 'success' },
    { trigger: 'keyword_added', action: 'run_agent', ts: Date.now() - 86400000, status: 'success' },
    { trigger: 'content_created', action: 'update_pipeline', ts: Date.now() - 172800000, status: 'failed' },
  ]);

  function getTrigger(val: string) { return TRIGGERS.find((t) => t.value === val); }
  function getAction(val: string) { return ACTIONS.find((a) => a.value === val); }

  function addRule() {
    const rule = { id: Date.now(), trigger: newTrigger, action: newAction, enabled: true };
    setLocalRules([...localRules, rule]);
    setShowAdd(false);
  }

  function toggleRule(id: number) {
    setLocalRules(localRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function removeRule(id: number) {
    setLocalRules(localRules.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Advanced</p>
        <h1 className="text-2xl font-bold">Automations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {localRules.length} rules &middot; {localRules.filter((r) => r.enabled).length} active &middot; Event-driven automation engine
        </p>
      </div>

      {/* Add Automation */}
      <div className="mb-6">
        {showAdd ? (
          <Card>
            <CardHeader><CardTitle className="text-sm">New Automation Rule</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">When (Trigger)</label>
                  <select className="w-full rounded border border-border bg-background p-2 text-sm" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}>
                    {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Then (Action)</label>
                  <select className="w-full rounded border border-border bg-background p-2 text-sm" value={newAction} onChange={(e) => setNewAction(e.target.value)}>
                    {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addRule}>Add Rule</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setShowAdd(true)}>+ Add Automation</Button>
        )}
      </div>

      {/* Rules */}
      <h2 className="text-lg font-semibold mb-3">Automation Rules</h2>
      <div className="space-y-2 mb-8">
        {localRules.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No automation rules yet. Click &quot;Add Automation&quot; to create one.</CardContent></Card>
        ) : localRules.map((rule) => {
          const trigger = getTrigger(rule.trigger);
          const action = getAction(rule.action);
          return (
            <Card key={rule.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <span className="text-lg">{trigger?.icon || '?'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{trigger?.label || rule.trigger}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>&#8594;</span> {action?.icon} {action?.label || rule.action}
                  </p>
                </div>
                <Badge variant={rule.enabled ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => toggleRule(rule.id)}>
                  {rule.enabled ? 'ON' : 'OFF'}
                </Badge>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => removeRule(rule.id)}>x</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity log */}
      <h2 className="text-lg font-semibold mb-3">Activity Log</h2>
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-4">Trigger</th><th className="text-left py-2 pr-4">Action</th><th className="text-left py-2 pr-4">Status</th><th className="text-left py-2">Time</th>
              </tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4">{getTrigger(l.trigger)?.icon} {getTrigger(l.trigger)?.label}</td>
                    <td className="py-2 pr-4">{getAction(l.action)?.icon} {getAction(l.action)?.label}</td>
                    <td className="py-2 pr-4"><Badge variant={l.status === 'success' ? 'default' : 'outline'} className={l.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'text-red-400'}>{l.status}</Badge></td>
                    <td className="py-2">{new Date(l.ts).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
