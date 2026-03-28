'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { PipelineGraph, DEFAULT_PIPELINE_NODES } from '@/components/PipelineGraph';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ─── Pipeline presets ──────────────────────────────────────── */

interface PipelinePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabledNodes: string[];
}

const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: 'full-autopilot',
    name: 'Full Autopilot',
    icon: '\uD83D\uDE80',
    description: 'All stages enabled — end-to-end content production',
    enabledNodes: DEFAULT_PIPELINE_NODES.map((n) => n.id),
  },
  {
    id: 'discovery-only',
    name: 'Discovery Only',
    icon: '\uD83D\uDD0D',
    description: 'Keyword discovery + content planning only, no generation',
    enabledNodes: ['keyword-scout', 'content-strategist'],
  },
  {
    id: 'write-and-publish',
    name: 'Write & Publish',
    icon: '\u270D\uFE0F',
    description: 'Skip discovery, write from your own keywords',
    enabledNodes: ['brief-generator', 'draft-writer', 'editor', 'quality-gates', 'publisher'],
  },
  {
    id: 'seo-fix',
    name: 'SEO Fix',
    icon: '\uD83D\uDD27',
    description: 'Skip writing, just scan and fix existing content',
    enabledNodes: ['editor', 'quality-gates', 'publisher'],
  },
  {
    id: 'distribution-only',
    name: 'Distribution Only',
    icon: '\uD83D\uDCE2',
    description: 'Repurpose and distribute existing published content',
    enabledNodes: ['repurposer'],
  },
];

/* ─── Helpers ───────────────────────────────────────────────── */

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function activityIcon(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('keyword') || lower.includes('discover')) return '\uD83D\uDD0D';
  if (lower.includes('plan') || lower.includes('queue') || lower.includes('schedule')) return '\uD83D\uDCDD';
  if (lower.includes('draft') || lower.includes('generat') || lower.includes('writ')) return '\u270D\uFE0F';
  if (lower.includes('seo') || lower.includes('meta') || lower.includes('fix')) return '\uD83D\uDD27';
  if (lower.includes('publish') || lower.includes('distribut')) return '\uD83D\uDE80';
  return '\u2726';
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function PipelineBuilderPage() {
  const {
    autopilot, setAutopilot, agents, pipelinePreset, setPipelinePreset,
    pipelineNodeConfig, togglePipelineNode,
  } = useWorkspace();

  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'configuration' | 'history'>('activity');

  const autopilotRunning = autopilot?.enabled ?? false;
  const anyAgentRunning = Object.values(agents.registry).some((a) => a.running);
  const agentHistory = agents?.history ?? [];

  /* Handle preset change */
  function applyPreset(preset: PipelinePreset) {
    setPipelinePreset(preset.id);
    // Enable/disable nodes according to preset
    for (const node of DEFAULT_PIPELINE_NODES) {
      const shouldEnable = preset.enabledNodes.includes(node.id);
      const currentlyEnabled = pipelineNodeConfig?.[node.id]?.enabled !== false;
      if (shouldEnable !== currentlyEnabled) {
        togglePipelineNode(node.id);
      }
    }
    toast.success(`Pipeline preset: ${preset.name}`);
  }

  /* Run pipeline = enable autopilot */
  function handleRunPipeline() {
    if (!autopilotRunning) {
      setAutopilot({ enabled: true });
      toast.success('Pipeline started — autopilot enabled');
    } else {
      setAutopilot({ enabled: false });
      toast.success('Pipeline paused');
    }
  }

  /* Recent pipeline activity */
  const recentActivity = useMemo(() => agentHistory.slice(0, 30), [agentHistory]);

  /* Pipeline run history (grouped by day) */
  const runHistory = useMemo(() => {
    const runs: Array<{
      date: string;
      actions: number;
      credits: number;
      articles: number;
    }> = [];

    const grouped: Record<string, { actions: number; credits: number; articles: number }> = {};
    for (const entry of agentHistory) {
      const date = new Date(entry.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { actions: 0, credits: 0, articles: 0 };
      grouped[date].actions++;
      grouped[date].credits += entry.creditsUsed || 0;
      if (entry.action.toLowerCase().includes('publish') || entry.action.toLowerCase().includes('draft')) {
        grouped[date].articles++;
      }
    }

    for (const [date, data] of Object.entries(grouped)) {
      runs.push({ date, ...data });
    }
    return runs.slice(0, 10);
  }, [agentHistory]);

  /* Per-node config for Configuration tab */
  const nodeConfigs = useMemo(() => {
    return DEFAULT_PIPELINE_NODES.map((node) => {
      const enabled = pipelineNodeConfig?.[node.id]?.enabled !== false;
      const order = pipelineNodeConfig?.[node.id]?.order ?? DEFAULT_PIPELINE_NODES.indexOf(node);
      const reg = agents.registry[node.agentId];
      return { ...node, enabled, order, lastRun: reg?.lastRun, running: reg?.running };
    });
  }, [pipelineNodeConfig, agents]);

  return (
    <div className="space-y-6">
      {/* ── Top bar ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Workflow</p>
          <h1 className="text-2xl font-bold">Pipeline Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize and customize how content flows through your agent pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'text-xs px-3 py-1',
              autopilotRunning
                ? anyAgentRunning
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'text-muted-foreground'
            )}
          >
            {autopilotRunning
              ? anyAgentRunning ? 'Running' : 'Idle'
              : 'Paused'}
          </Badge>
          <Button
            size="sm"
            onClick={handleRunPipeline}
            className={cn(
              autopilotRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            )}
          >
            {autopilotRunning ? 'Pause Pipeline' : 'Run Pipeline'}
          </Button>
        </div>
      </div>

      {/* ── Presets ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {PIPELINE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all border',
              pipelinePreset === preset.id
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 font-semibold'
                : 'border-border text-muted-foreground hover:border-blue-500/30 hover:text-foreground',
            )}
            title={preset.description}
          >
            <span>{preset.icon}</span>
            <span>{preset.name}</span>
          </button>
        ))}
      </div>

      {/* ── Pipeline Graph ─────────────────────────────── */}
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardContent className="p-4 sm:p-6">
          <PipelineGraph
            onNodeClick={(id) => setExpandedNode(expandedNode === id ? null : id)}
            expandedNode={expandedNode}
          />
        </CardContent>
      </Card>

      {/* ── Bottom Panel (tabbed) ──────────────────────── */}
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-1 border-b border-border -mx-4 px-4">
            {(['activity', 'configuration', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px capitalize',
                  activeTab === tab
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry, i) => (
                  <div
                    key={`${entry.ts}-${i}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm mt-0.5 shrink-0">{activityIcon(entry.action)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{entry.action}</p>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {entry.agentId}
                        {entry.creditsUsed > 0 && ` \u00b7 ${entry.creditsUsed} credits`}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 font-mono whitespace-nowrap shrink-0">
                      {relativeTime(entry.ts)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <span className="text-2xl">{'\uD83D\uDCCA'}</span>
                  <p className="text-sm text-muted-foreground mt-2">No pipeline activity yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Enable autopilot to start the pipeline</p>
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'configuration' && (
            <div className="space-y-3">
              {nodeConfigs.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                    node.enabled ? 'border-border' : 'border-border/50 opacity-60',
                  )}
                >
                  <span className="text-lg shrink-0">{node.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{node.name}</span>
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        {node.agentId}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{node.description}</p>
                    {node.lastRun && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        Last run: {relativeTime(node.lastRun)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {node.running && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                      </span>
                    )}
                    <button
                      onClick={() => togglePipelineNode(node.id)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        node.enabled ? 'bg-emerald-500' : 'bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-3 w-3 rounded-full bg-white transition-transform',
                          node.enabled ? 'translate-x-5' : 'translate-x-1',
                        )}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {runHistory.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-4 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono">
                    <span>Date</span>
                    <span>Actions</span>
                    <span>Credits</span>
                    <span>Articles</span>
                  </div>
                  {runHistory.map((run, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-4 gap-4 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">{run.date}</span>
                      <span className="text-sm text-muted-foreground">{run.actions}</span>
                      <span className="text-sm text-muted-foreground font-mono">{run.credits}</span>
                      <span className="text-sm text-muted-foreground">{run.articles}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="text-2xl">{'\uD83D\uDCC5'}</span>
                  <p className="text-sm text-muted-foreground mt-2">No pipeline run history</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">History appears after agents process content</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
