'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/* ─── Pipeline node definitions ─────────────────────────────── */

export interface PipelineNodeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  agentId: string; // maps to agents.registry key
  outputLabel: string; // e.g. "keywords", "plans", "drafts"
}

export const DEFAULT_PIPELINE_NODES: PipelineNodeDef[] = [
  {
    id: 'keyword-scout',
    name: 'Keyword Scout',
    icon: '\uD83D\uDD0D',
    description: 'Discovers high-opportunity keywords in your niche',
    agentId: 'keywordOpportunity',
    outputLabel: 'keywords',
  },
  {
    id: 'content-strategist',
    name: 'Content Strategist',
    icon: '\u265F\uFE0F',
    description: 'Plans content calendar and topic clusters',
    agentId: 'contentAutopilot',
    outputLabel: 'plans',
  },
  {
    id: 'brief-generator',
    name: 'Brief Generator',
    icon: '\uD83D\uDCCB',
    description: 'Creates detailed content briefs with outlines',
    agentId: 'contentAutopilot',
    outputLabel: 'briefs',
  },
  {
    id: 'draft-writer',
    name: 'Draft Writer',
    icon: '\u270D\uFE0F',
    description: 'Generates full article drafts from briefs',
    agentId: 'contentAutopilot',
    outputLabel: 'drafts',
  },
  {
    id: 'editor',
    name: 'Editor',
    icon: '\uD83D\uDD27',
    description: 'Reviews and polishes drafts for quality and SEO',
    agentId: 'seoGuardian',
    outputLabel: 'edits',
  },
  {
    id: 'quality-gates',
    name: 'Quality Gates',
    icon: '\u2714\uFE0F',
    description: 'Checks SEO score, readability, and brand voice',
    agentId: 'healthMonitor',
    outputLabel: 'passed',
  },
  {
    id: 'publisher',
    name: 'Publisher',
    icon: '\uD83D\uDE80',
    description: 'Publishes content and submits to search engines',
    agentId: 'publishingPipeline',
    outputLabel: 'published',
  },
  {
    id: 'repurposer',
    name: 'Repurposer',
    icon: '\u267B\uFE0F',
    description: 'Creates social posts, shorts, and thread variants',
    agentId: 'interlinkBuilder',
    outputLabel: 'variants',
  },
];

/* ─── Status types ──────────────────────────────────────────── */

export type NodeStatus = 'idle' | 'running' | 'complete' | 'error' | 'skipped';

function getStatusStyles(status: NodeStatus) {
  switch (status) {
    case 'running':
      return {
        ring: 'ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
        dot: 'bg-blue-500',
        text: 'text-blue-400',
        bg: 'bg-blue-500/5',
        label: 'Running',
      };
    case 'complete':
      return {
        ring: 'ring-emerald-500/40',
        dot: 'bg-emerald-500',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        label: 'Complete',
      };
    case 'error':
      return {
        ring: 'ring-rose-500/40',
        dot: 'bg-rose-500',
        text: 'text-rose-400',
        bg: 'bg-rose-500/5',
        label: 'Error',
      };
    case 'skipped':
      return {
        ring: 'ring-border opacity-50',
        dot: 'bg-muted-foreground/30',
        text: 'text-muted-foreground/50',
        bg: '',
        label: 'Skipped',
      };
    default:
      return {
        ring: 'ring-border',
        dot: 'bg-muted-foreground/40',
        text: 'text-muted-foreground',
        bg: '',
        label: 'Idle',
      };
  }
}

function getConnectionColor(status: NodeStatus) {
  switch (status) {
    case 'complete': return 'text-emerald-500/60';
    case 'running': return 'text-blue-500/60';
    default: return 'text-muted-foreground/20';
  }
}

/* ─── Compact mode (for dashboard) ──────────────────────────── */

export function PipelineGraphCompact() {
  const { agents, autopilot, pipelineNodeConfig } = useWorkspace();
  const autopilotPhase = (autopilot as unknown as Record<string, unknown>)?.phase as string | undefined;

  const nodeStatuses = useMemo(() => {
    const statuses: Record<string, NodeStatus> = {};
    for (const node of DEFAULT_PIPELINE_NODES) {
      const config = pipelineNodeConfig?.[node.id];
      if (config && !config.enabled) {
        statuses[node.id] = 'skipped';
        continue;
      }
      const reg = agents.registry[node.agentId];
      if (reg?.running) {
        statuses[node.id] = 'running';
      } else if (reg?.lastRun && Date.now() - reg.lastRun < 3600000) {
        statuses[node.id] = 'complete';
      } else {
        statuses[node.id] = 'idle';
      }
    }
    return statuses;
  }, [agents, pipelineNodeConfig]);

  const sortedNodes = useMemo(() => {
    return [...DEFAULT_PIPELINE_NODES].sort((a, b) => {
      const orderA = pipelineNodeConfig?.[a.id]?.order ?? DEFAULT_PIPELINE_NODES.indexOf(a);
      const orderB = pipelineNodeConfig?.[b.id]?.order ?? DEFAULT_PIPELINE_NODES.indexOf(b);
      return orderA - orderB;
    });
  }, [pipelineNodeConfig]);

  return (
    <Link href="/pipeline-builder" className="block">
      <Card className="bg-card/80 backdrop-blur border-border hover:border-blue-500/30 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground">Content Pipeline</span>
            <Badge variant="outline" className={cn(
              'text-[9px]',
              autopilot?.enabled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'text-muted-foreground'
            )}>
              {autopilot?.enabled ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {sortedNodes.map((node, i) => {
              const status = nodeStatuses[node.id] || 'idle';
              const styles = getStatusStyles(status);
              return (
                <div key={node.id} className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-1.5" title={`${node.name}: ${styles.label}`}>
                    <span className={cn('w-2 h-2 rounded-full shrink-0', styles.dot, status === 'running' && 'animate-pulse')} />
                    <span className={cn('text-[10px] whitespace-nowrap', styles.text)}>
                      {node.name}
                    </span>
                  </div>
                  {i < sortedNodes.length - 1 && (
                    <span className="text-muted-foreground/30 text-[10px] mx-0.5">&rarr;</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ─── Full pipeline graph ───────────────────────────────────── */

interface PipelineGraphProps {
  onNodeClick?: (nodeId: string) => void;
  expandedNode?: string | null;
}

export function PipelineGraph({ onNodeClick, expandedNode }: PipelineGraphProps) {
  const {
    agents, autopilot, keywords, content, contentBriefs,
    autopilotEngineState, pipelineNodeConfig, togglePipelineNode,
  } = useWorkspace();

  /* Compute node statuses from agent registry */
  const nodeStatuses = useMemo(() => {
    const statuses: Record<string, NodeStatus> = {};
    for (const node of DEFAULT_PIPELINE_NODES) {
      const config = pipelineNodeConfig?.[node.id];
      if (config && !config.enabled) {
        statuses[node.id] = 'skipped';
        continue;
      }
      const reg = agents.registry[node.agentId];
      if (reg?.running) {
        statuses[node.id] = 'running';
      } else if (reg?.lastRun && Date.now() - reg.lastRun < 3600000) {
        statuses[node.id] = 'complete';
      } else {
        statuses[node.id] = 'idle';
      }
    }
    return statuses;
  }, [agents, pipelineNodeConfig]);

  /* Compute item counts flowing through each node */
  const nodeCounts = useMemo(() => {
    const counts: Record<string, { count: number; label: string }> = {};
    const discoveredKws = autopilotEngineState?.discoveredKeywords?.length ?? 0;
    const plannedContent = autopilotEngineState?.plannedContent?.length ?? 0;
    const briefs = Object.keys(contentBriefs || {}).length;
    const drafts = content.filter((c) => c.status === 'draft').length;
    const review = content.filter((c) => c.status === 'review').length;
    const published = content.filter((c) => c.status === 'published').length;
    const kwCount = keywords.length;

    counts['keyword-scout'] = { count: discoveredKws || kwCount, label: discoveredKws || kwCount ? 'keywords' : 'keywords' };
    counts['content-strategist'] = { count: plannedContent, label: 'plans' };
    counts['brief-generator'] = { count: briefs, label: 'briefs' };
    counts['draft-writer'] = { count: drafts, label: 'drafts' };
    counts['editor'] = { count: review, label: 'in review' };
    counts['quality-gates'] = { count: review, label: 'checking' };
    counts['publisher'] = { count: published, label: 'published' };
    counts['repurposer'] = { count: 0, label: 'variants' };
    return counts;
  }, [autopilotEngineState, content, keywords, contentBriefs]);

  /* Agent history for node detail panel */
  const agentHistory = agents?.history ?? [];

  /* Sort nodes by configured order */
  const sortedNodes = useMemo(() => {
    return [...DEFAULT_PIPELINE_NODES].sort((a, b) => {
      const orderA = pipelineNodeConfig?.[a.id]?.order ?? DEFAULT_PIPELINE_NODES.indexOf(a);
      const orderB = pipelineNodeConfig?.[b.id]?.order ?? DEFAULT_PIPELINE_NODES.indexOf(b);
      return orderA - orderB;
    });
  }, [pipelineNodeConfig]);

  return (
    <div className="w-full">
      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex items-start gap-0 overflow-x-auto pb-4">
        {sortedNodes.map((node, i) => {
          const status = nodeStatuses[node.id] || 'idle';
          const styles = getStatusStyles(status);
          const counts = nodeCounts[node.id] || { count: 0, label: '' };
          const isExpanded = expandedNode === node.id;
          const isEnabled = pipelineNodeConfig?.[node.id]?.enabled !== false;
          const recentActions = agentHistory
            .filter((h) => h.agentId === node.agentId)
            .slice(0, 3);

          return (
            <div key={node.id} className="flex items-start shrink-0">
              {/* Node card */}
              <div className="flex flex-col items-center" style={{ width: '140px' }}>
                <button
                  onClick={() => onNodeClick?.(node.id)}
                  className={cn(
                    'w-full rounded-xl ring-1 p-3 transition-all cursor-pointer text-left relative',
                    styles.ring,
                    styles.bg,
                    isExpanded && 'ring-2 ring-blue-500',
                    !isEnabled && 'opacity-40',
                  )}
                >
                  {/* Running pulse animation */}
                  {status === 'running' && (
                    <div className="absolute inset-0 rounded-xl animate-pulse bg-blue-500/5" />
                  )}

                  {/* Status dot */}
                  <div className="flex items-center justify-between mb-2 relative">
                    <span className="text-lg">{node.icon}</span>
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      styles.dot,
                      status === 'running' && 'animate-pulse',
                    )} />
                  </div>

                  {/* Name */}
                  <div className={cn('text-xs font-semibold leading-tight mb-1 relative', styles.text)}>
                    {node.name}
                  </div>

                  {/* Count */}
                  {counts.count > 0 && (
                    <div className="text-[10px] text-muted-foreground font-mono relative">
                      {counts.count} {counts.label}
                    </div>
                  )}

                  {/* Status label */}
                  <div className={cn('text-[9px] mt-1.5 font-medium relative', styles.text)}>
                    {status === 'complete' && '\u2713 '}{styles.label}
                  </div>

                  {/* Toggle indicator */}
                  {!isEnabled && (
                    <div className="absolute top-2 right-2 text-[8px] text-muted-foreground/60 uppercase tracking-wider font-mono">
                      OFF
                    </div>
                  )}
                </button>

                {/* Toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePipelineNode(node.id);
                  }}
                  className={cn(
                    'mt-1.5 text-[9px] px-2 py-0.5 rounded-full transition-colors',
                    isEnabled
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-muted-foreground/50 hover:bg-muted',
                  )}
                >
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="mt-2 w-[200px] rounded-lg border border-border bg-card p-3 text-left shadow-lg">
                    <p className="text-[11px] text-muted-foreground mb-2">{node.description}</p>
                    {recentActions.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-mono">Recent</span>
                        {recentActions.map((a, j) => (
                          <div key={j} className="text-[10px] text-muted-foreground truncate">
                            {a.action}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">No recent activity</span>
                    )}
                  </div>
                )}
              </div>

              {/* Connection arrow */}
              {i < sortedNodes.length - 1 && (
                <div className="flex flex-col items-center justify-center pt-8 px-1" style={{ minWidth: '40px' }}>
                  <div className={cn('pipeline-connection h-[2px] w-full', getConnectionColor(status))} />
                  {counts.count > 0 && (
                    <span className="text-[9px] text-muted-foreground/50 font-mono mt-1">
                      {counts.count} &rarr;
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="md:hidden space-y-0">
        {sortedNodes.map((node, i) => {
          const status = nodeStatuses[node.id] || 'idle';
          const styles = getStatusStyles(status);
          const counts = nodeCounts[node.id] || { count: 0, label: '' };
          const isExpanded = expandedNode === node.id;
          const isEnabled = pipelineNodeConfig?.[node.id]?.enabled !== false;
          const recentActions = agentHistory
            .filter((h) => h.agentId === node.agentId)
            .slice(0, 3);

          return (
            <div key={node.id}>
              {/* Node */}
              <button
                onClick={() => onNodeClick?.(node.id)}
                className={cn(
                  'w-full rounded-xl ring-1 p-3 transition-all cursor-pointer text-left relative flex items-center gap-3',
                  styles.ring,
                  styles.bg,
                  isExpanded && 'ring-2 ring-blue-500',
                  !isEnabled && 'opacity-40',
                )}
              >
                {status === 'running' && (
                  <div className="absolute inset-0 rounded-xl animate-pulse bg-blue-500/5" />
                )}
                <span className="text-lg relative">{node.icon}</span>
                <div className="flex-1 relative">
                  <div className={cn('text-xs font-semibold', styles.text)}>{node.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-[9px] font-medium', styles.text)}>
                      {status === 'complete' && '\u2713 '}{styles.label}
                    </span>
                    {counts.count > 0 && (
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {counts.count} {counts.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 relative">
                  <span className={cn('w-2.5 h-2.5 rounded-full', styles.dot, status === 'running' && 'animate-pulse')} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePipelineNode(node.id);
                    }}
                    className={cn(
                      'text-[9px] px-2 py-0.5 rounded-full',
                      isEnabled ? 'text-emerald-400' : 'text-muted-foreground/50',
                    )}
                  >
                    {isEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </button>

              {/* Expanded detail (mobile) */}
              {isExpanded && (
                <div className="mx-4 mt-1 mb-1 rounded-lg border border-border bg-card p-3 shadow-lg">
                  <p className="text-[11px] text-muted-foreground mb-2">{node.description}</p>
                  {recentActions.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-mono">Recent</span>
                      {recentActions.map((a, j) => (
                        <div key={j} className="text-[10px] text-muted-foreground truncate">{a.action}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">No recent activity</span>
                  )}
                </div>
              )}

              {/* Vertical connection */}
              {i < sortedNodes.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="flex flex-col items-center">
                    <div className={cn('pipeline-connection-v w-[2px] h-4', getConnectionColor(status))} />
                    {counts.count > 0 && (
                      <span className="text-[8px] text-muted-foreground/40 font-mono">{counts.count}&darr;</span>
                    )}
                    <div className={cn('pipeline-connection-v w-[2px] h-2', getConnectionColor(status))} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CSS for animated connections */}
      <style jsx>{`
        .pipeline-connection {
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 8px,
            currentColor 8px,
            currentColor 12px
          );
          animation: flow-h 1s linear infinite;
        }
        @keyframes flow-h {
          from { background-position: 0 0; }
          to { background-position: 20px 0; }
        }
        .pipeline-connection-v {
          background: repeating-linear-gradient(
            180deg,
            transparent,
            transparent 6px,
            currentColor 6px,
            currentColor 10px
          );
          animation: flow-v 1s linear infinite;
        }
        @keyframes flow-v {
          from { background-position: 0 0; }
          to { background-position: 0 16px; }
        }
      `}</style>
    </div>
  );
}
