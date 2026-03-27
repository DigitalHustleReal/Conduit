'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

const AGENTS_META: Record<string, { name: string; icon: string; type: string; interval: string; credits: string; desc: string }> = {
  contentAutopilot: { name: 'Content Autopilot', icon: '✍️', type: 'AI', interval: 'On demand', credits: '~5/article', desc: 'Generates full articles from keyword briefs' },
  seoGuardian: { name: 'SEO Guardian', icon: '🛡️', type: 'Heuristic+AI', interval: '5 min', credits: '0 scan / 1 fix', desc: 'Scans content for SEO issues and auto-fixes' },
  keywordOpportunity: { name: 'Keyword Opportunity', icon: '🔑', type: 'AI', interval: 'On demand', credits: '1/run', desc: 'Discovers keyword gaps and opportunities' },
  publishingPipeline: { name: 'Pipeline Manager', icon: '📦', type: 'Heuristic', interval: '2 min', credits: '0', desc: 'Manages content workflow and pipeline stages' },
  smartOnboarding: { name: 'Smart Onboarding', icon: '🎓', type: 'AI', interval: 'One-time', credits: '~3', desc: 'Creates starter content for new workspaces' },
  healthMonitor: { name: 'Health Monitor', icon: '💊', type: 'Heuristic', interval: '10 min', credits: '0', desc: 'Monitors workspace health and flags issues' },
  contentRefresh: { name: 'Content Refresh', icon: '♻️', type: 'AI', interval: 'On demand', credits: '1/article', desc: 'Updates stale content with fresh information' },
  interlinkBuilder: { name: 'Interlink Builder', icon: '🔗', type: 'AI', interval: 'On demand', credits: '1/run', desc: 'Builds internal link structures between content' },
};

const HIERARCHY = [
  { level: 'Director', icon: '🧠', label: 'Conductor Agent', desc: 'Orchestrates all agent activity, allocates budget' },
  { level: 'Manager', icon: '📋', label: 'Task Managers', desc: 'Content Manager, SEO Manager, Distribution Manager' },
  { level: 'Worker', icon: '⚙️', label: 'Worker Agents', desc: '8 specialized agents executing tasks' },
];

export default function AIAgentsPage() {
  const { agents, autopilot, setAutopilot, logAgentRun } = useWorkspace();
  const [budgetDaily, setBudgetDaily] = useState(autopilot.creditBudget.daily);
  const [budgetWeekly, setBudgetWeekly] = useState(autopilot.creditBudget.weekly);

  const totalRuns = agents.history.length;
  const totalCredits = agents.history.reduce((s, h) => s + h.creditsUsed, 0);
  const activeCount = Object.values(agents.registry).filter((a) => a.enabled).length;

  function toggleAgent(id: string) {
    // Toggle is visual-only; real toggle would update registry in store
  }

  function runNow(id: string) {
    logAgentRun(id, 'manual_run', { status: 'completed' }, AGENTS_META[id]?.credits === '0' ? 0 : 1);
  }

  function formatTime(ts: number | null) {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleString();
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Autonomous Intelligence</p>
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeCount} active agents &middot; {totalRuns} total runs &middot; {totalCredits} credits used
          {autopilot.enabled && <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-400/30">Autopilot ON</Badge>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active Agents</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalRuns}</p><p className="text-xs text-muted-foreground">Total Runs</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalCredits}</p><p className="text-xs text-muted-foreground">Credits Used</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{autopilot.stats.issues_fixed}</p><p className="text-xs text-muted-foreground">Issues Fixed</p></CardContent></Card>
      </div>

      {/* Core Agents */}
      <h2 className="text-lg font-semibold mb-3">Autonomous Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
        {Object.entries(AGENTS_META).map(([id, meta]) => {
          const reg = agents.registry[id];
          return (
            <Card key={id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <CardTitle className="text-sm flex-1">{meta.name}</CardTitle>
                  <Badge variant={reg?.enabled ? 'default' : 'outline'} className="text-[10px] cursor-pointer" onClick={() => toggleAgent(id)}>
                    {reg?.enabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">{meta.desc}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                  <span>{meta.type}</span><span>&middot;</span><span>{meta.interval}</span><span>&middot;</span><span>{meta.credits} credits</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Last: {formatTime(reg?.lastRun ?? null)}</span>
                  <Button size="sm" variant="outline" onClick={() => runNow(id)}>Run Now</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hierarchy */}
      <h2 className="text-lg font-semibold mb-3">Agent Hierarchy</h2>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {HIERARCHY.map((h, i) => (
          <Card key={h.level} className="flex-1">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl mb-1">{h.icon}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h.level}</p>
              <p className="text-sm font-medium mt-1">{h.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{h.desc}</p>
              {i < HIERARCHY.length - 1 && <p className="text-muted-foreground mt-2 hidden sm:block">&#8595;</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent History */}
      <h2 className="text-lg font-semibold mb-3">Agent History</h2>
      <Card className="mb-8">
        <CardContent className="pt-4">
          {agents.history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No agent runs yet. Enable an agent and click &quot;Run Now&quot; to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-4">Agent</th><th className="text-left py-2 pr-4">Action</th><th className="text-left py-2 pr-4">Credits</th><th className="text-left py-2">Time</th>
                </tr></thead>
                <tbody>
                  {agents.history.slice(0, 20).map((h, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{AGENTS_META[h.agentId]?.name ?? h.agentId}</td>
                      <td className="py-2 pr-4">{h.action}</td>
                      <td className="py-2 pr-4">{h.creditsUsed}</td>
                      <td className="py-2">{formatTime(h.ts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Autopilot */}
      <h2 className="text-lg font-semibold mb-3">Autopilot Configuration</h2>
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Autopilot Mode</p>
              <p className="text-xs text-muted-foreground">Let agents run autonomously on schedule</p>
            </div>
            <Button variant={autopilot.enabled ? 'default' : 'outline'} size="sm" onClick={() => setAutopilot({ enabled: !autopilot.enabled })}>
              {autopilot.enabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Daily Credit Budget</label>
              <Input type="number" value={budgetDaily} onChange={(e) => setBudgetDaily(+e.target.value)} onBlur={() => setAutopilot({ creditBudget: { ...autopilot.creditBudget, daily: budgetDaily } })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Weekly Credit Budget</label>
              <Input type="number" value={budgetWeekly} onChange={(e) => setBudgetWeekly(+e.target.value)} onBlur={() => setAutopilot({ creditBudget: { ...autopilot.creditBudget, weekly: budgetWeekly } })} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Today: {autopilot.creditBudget.used_today} / {autopilot.creditBudget.daily} credits</p>
            <Progress value={(autopilot.creditBudget.used_today / autopilot.creditBudget.daily) * 100} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
