'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  CORE_AGENTS,
  loadAgentMemories,
  getAllAgentMemories,
  runAgentById,
  getAllAgentStatuses,
} from '@/lib/agents/registry';
import type { AgentWorkspaceView } from '@/lib/agents/runtime';
import { PIPELINE_DISPLAY_STAGES } from '@/lib/agents/handoff';
import { analyzeVoice, type BrandVoiceProfile } from '@/lib/agents/voice';
import { checkDeadlines, getUpcomingDeadlines } from '@/lib/agents/deadlines';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approvalColor(rate: number): string {
  if (rate >= 0.7) return 'text-emerald-400';
  if (rate >= 0.4) return 'text-amber-400';
  return 'text-rose-400';
}

function approvalBadgeClass(rate: number): string {
  if (rate >= 0.7) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (rate >= 0.4) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
}

function goalProgress(current: number, target: number, lowerIsBetter = false): number {
  if (lowerIsBetter) {
    if (current <= target) return 100;
    // Show inverse progress for lower-is-better metrics
    return Math.max(0, Math.round((1 - (current - target) / Math.max(current, 1)) * 100));
  }
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / target) * 100));
}

const LOWER_IS_BETTER = new Set(['low_seo_count', 'stale_content_count', 'declining_content', 'orphan_pages']);

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AIAgentsPage() {
  const store = useWorkspace();
  const {
    autopilot, setAutopilot, agentRuntimeMemories, updateAgentRuntimeMemory,
    brandVoiceProfile, setBrandVoiceProfile, content, deadlines,
  } = store;

  const [budgetDaily, setBudgetDaily] = useState(autopilot.creditBudget.daily);
  const [budgetWeekly, setBudgetWeekly] = useState(autopilot.creditBudget.weekly);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<ReturnType<typeof getAllAgentStatuses>>([]);
  const [analyzingVoice, setAnalyzingVoice] = useState(false);

  // Load persisted memories into agent instances on mount
  useEffect(() => {
    loadAgentMemories(agentRuntimeMemories);
    setAgentStatuses(getAllAgentStatuses());
  }, [agentRuntimeMemories]);

  // Build the workspace view that agents need
  const buildStoreView = useCallback((): AgentWorkspaceView => {
    const s = useWorkspace.getState();
    return {
      content: s.content,
      keywords: s.keywords,
      niche: s.niche,
      domain: s.domain,
      competitors: s.competitors,
      reviewQueue: s.reviewQueue.map((q) => ({ status: q.status, type: q.type })),
      settings: s.settings as unknown as Record<string, string>,
      deductCredit: s.deductCredit as (type?: string) => boolean,
      addToQueue: s.addToQueue,
      logAgentRun: s.logAgentRun,
    };
  }, []);

  // Run a single agent
  const handleRunAgent = useCallback(async (agentId: string) => {
    setRunningAgent(agentId);
    try {
      const storeView = buildStoreView();
      const settings = useWorkspace.getState().settings as unknown as Record<string, string>;
      const result = await runAgentById(agentId, storeView, settings);

      if (!result) {
        toast.error(`Agent ${agentId} not found`);
        return;
      }

      // Persist updated memory
      const memories = getAllAgentMemories();
      for (const [id, mem] of Object.entries(memories)) {
        updateAgentRuntimeMemory(id, mem);
      }

      // Refresh statuses
      setAgentStatuses(getAllAgentStatuses());

      if (result.acted) {
        toast.success(`${agentId}: ${result.action}`, {
          description: `${result.reasoning} (${result.creditsUsed} credits)`,
        });
      } else {
        toast.info(`${agentId}: No action needed`, {
          description: result.reasoning,
        });
      }
    } catch (err) {
      toast.error(`Agent error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningAgent(null);
    }
  }, [buildStoreView, updateAgentRuntimeMemory]);

  // Run ALL agents
  const handleRunAll = useCallback(async () => {
    setRunningAgent('all');
    let actedCount = 0;
    let totalCredits = 0;

    for (const agent of CORE_AGENTS) {
      try {
        const storeView = buildStoreView();
        const settings = useWorkspace.getState().settings as unknown as Record<string, string>;
        const result = await agent.run(storeView, settings);
        if (result.acted) actedCount++;
        totalCredits += result.creditsUsed;
      } catch {
        // Continue with other agents
      }
    }

    // Persist all memories
    const memories = getAllAgentMemories();
    for (const [id, mem] of Object.entries(memories)) {
      updateAgentRuntimeMemory(id, mem);
    }
    setAgentStatuses(getAllAgentStatuses());

    toast.success(`Agent sweep complete`, {
      description: `${actedCount} agents took action, ${totalCredits} credits used`,
    });
    setRunningAgent(null);
  }, [buildStoreView, updateAgentRuntimeMemory]);

  // Voice analysis handler
  const handleAnalyzeVoice = useCallback(() => {
    setAnalyzingVoice(true);
    try {
      const profile = analyzeVoice(content);
      setBrandVoiceProfile(profile);
      toast.success('Brand voice profile updated', {
        description: `Tone: ${profile.tone}, Vocabulary: ${profile.vocabularyLevel}`,
      });
    } catch (err) {
      toast.error(`Voice analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAnalyzingVoice(false);
    }
  }, [content, setBrandVoiceProfile]);

  // Deadline check
  const deadlineStatus = checkDeadlines([...deadlines]);
  const upcomingDeadlines = getUpcomingDeadlines(deadlines, 7);

  // Aggregate stats
  const totalRuns = agentStatuses.reduce((s, a) => s + a.status.totalRuns, 0);
  const totalActions = agentStatuses.reduce((s, a) => s + a.status.totalActions, 0);
  const totalApproved = agentStatuses.reduce((s, a) => s + a.status.totalApproved, 0);
  const totalRejected = agentStatuses.reduce((s, a) => s + a.status.totalRejected, 0);
  const overallApproval = (totalApproved + totalRejected) > 0
    ? totalApproved / (totalApproved + totalRejected)
    : 1;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Autonomous Intelligence</p>
          <h1 className="text-2xl font-bold">AI Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            8 autonomous agents with memory, perception, and learning
            {autopilot.enabled && <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-400/30">Autopilot ON</Badge>}
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          disabled={runningAgent !== null}
          onClick={handleRunAll}
        >
          {runningAgent === 'all' ? 'Running all...' : 'Run All Agents'}
        </Button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">8</p><p className="text-xs text-muted-foreground">Agents</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalRuns}</p><p className="text-xs text-muted-foreground">Total Runs</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalActions}</p><p className="text-xs text-muted-foreground">Actions Taken</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className={`text-2xl font-bold ${approvalColor(overallApproval)}`}>{Math.round(overallApproval * 100)}%</p><p className="text-xs text-muted-foreground">Approval Rate</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalApproved}<span className="text-sm text-muted-foreground">/{totalApproved + totalRejected}</span></p><p className="text-xs text-muted-foreground">Approved/Total</p></CardContent></Card>
      </div>

      {/* Agent Cards */}
      <h2 className="text-lg font-semibold mb-3">Autonomous Agents</h2>
      <div className="space-y-3 mb-8">
        {agentStatuses.map((agent) => {
          const s = agent.status;
          const isExpanded = expandedAgent === agent.id;
          const isRunning = runningAgent === agent.id || runningAgent === 'all';

          return (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{agent.name}</CardTitle>
                      <Badge variant="outline" className={approvalBadgeClass(s.approvalRate)}>
                        {Math.round(s.approvalRate * 100)}% approval
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{agent.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRunning}
                      onClick={() => handleRunAgent(agent.id)}
                    >
                      {isRunning ? 'Running...' : 'Run Now'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                    >
                      {isExpanded ? 'Collapse' : 'Details'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>Last run: {s.lastRun}</span>
                  <span>{s.totalRuns} runs</span>
                  <span>{s.totalActions} actions</span>
                  <span>{s.totalApproved} approved, {s.totalRejected} rejected</span>
                </div>

                {/* Recent insight */}
                <div className="text-xs bg-muted/50 rounded px-3 py-2 mb-3">
                  {s.recentInsight}
                </div>

                {/* Goals progress */}
                {s.goals.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {s.goals.map((goal) => {
                      const lowerBetter = LOWER_IS_BETTER.has(goal.metric);
                      const pct = goalProgress(goal.current, goal.target, lowerBetter);
                      const metricLabel = goal.metric.replace(/_/g, ' ');
                      return (
                        <div key={goal.metric}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="capitalize">{metricLabel}</span>
                            <span>
                              {goal.current} / {goal.target}
                              {' '}
                              <Badge variant="outline" className="text-[9px] ml-1">{goal.priority}</Badge>
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Expanded memory viewer */}
                {isExpanded && (
                  <div className="border-t border-border pt-3 mt-3 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agent Memory</h4>

                    {/* Success patterns */}
                    {s.successPatterns.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-400 mb-1">Success Patterns (what works)</p>
                        <div className="flex flex-wrap gap-1">
                          {s.successPatterns.map((p, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              {p.length > 60 ? p.slice(0, 60) + '...' : p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avoid patterns */}
                    {s.avoidPatterns.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-rose-400 mb-1">Avoid Patterns (what to skip)</p>
                        <div className="flex flex-wrap gap-1">
                          {s.avoidPatterns.map((p, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20">
                              {p.length > 60 ? p.slice(0, 60) + '...' : p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User preferences */}
                    {Object.keys(s.userPreferences).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-400 mb-1">Learned Preferences</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(s.userPreferences).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {k}: {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.successPatterns.length === 0 && s.avoidPatterns.length === 0 && Object.keys(s.userPreferences).length === 0 && (
                      <p className="text-xs text-muted-foreground">No patterns learned yet. Run the agent and approve/reject its suggestions to build memory.</p>
                    )}

                    {/* Recent decisions */}
                    {agentRuntimeMemories[agent.id]?.recentDecisions && agentRuntimeMemories[agent.id].recentDecisions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Recent Decisions</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {agentRuntimeMemories[agent.id].recentDecisions.slice(0, 10).map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <Badge
                                variant="outline"
                                className={`text-[9px] ${
                                  d.outcome === 'approved' ? 'text-emerald-400 border-emerald-500/30' :
                                  d.outcome === 'rejected' ? 'text-rose-400 border-rose-500/30' :
                                  d.outcome === 'pending' ? 'text-amber-400 border-amber-500/30' :
                                  'text-blue-400 border-blue-500/30'
                                }`}
                              >
                                {d.outcome}
                              </Badge>
                              <span className="truncate flex-1">{d.action}</span>
                              <span className="text-muted-foreground shrink-0">{new Date(d.timestamp).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Autopilot Configuration */}
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

      {/* Content Pipeline */}
      <h2 className="text-lg font-semibold mb-3 mt-8">Content Pipeline</h2>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-4">
            Content moves through this pipeline automatically. Each stage is handled by a dedicated agent.
          </p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {PIPELINE_DISPLAY_STAGES.map((stage, i) => {
              const agentStatus = agentStatuses.find((a) => a.id === stage.id);
              const hasActivity = agentStatus && agentStatus.status.totalRuns > 0;
              return (
                <div key={stage.id} className="flex items-center gap-1 shrink-0">
                  <div className={`rounded-lg border px-3 py-2 text-center min-w-[100px] ${hasActivity ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                    <p className="text-xs font-medium">{stage.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stage.description}</p>
                    {agentStatus && (
                      <p className="text-[10px] text-muted-foreground mt-1">{agentStatus.status.totalActions} actions</p>
                    )}
                  </div>
                  {i < PIPELINE_DISPLAY_STAGES.length - 1 && (
                    <span className="text-muted-foreground text-xs shrink-0">&rarr;</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Brand Voice */}
      <h2 className="text-lg font-semibold mb-3 mt-8">Brand Voice</h2>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Voice Profile</p>
              <p className="text-xs text-muted-foreground">
                Analyzes your published content to learn your writing style (0 credits)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={analyzingVoice}
              onClick={handleAnalyzeVoice}
            >
              {analyzingVoice ? 'Analyzing...' : brandVoiceProfile ? 'Re-analyze' : 'Analyze Voice'}
            </Button>
          </div>

          {brandVoiceProfile ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Tone</p>
                <p className="text-sm font-medium capitalize">{brandVoiceProfile.tone}</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Vocabulary</p>
                <p className="text-sm font-medium capitalize">{brandVoiceProfile.vocabularyLevel}</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Avg Sentence</p>
                <p className="text-sm font-medium">{brandVoiceProfile.avgSentenceLength} words</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">First Person</p>
                <p className="text-sm font-medium">{brandVoiceProfile.usesFirstPerson ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Prefers Lists</p>
                <p className="text-sm font-medium">{brandVoiceProfile.prefersLists ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Heading Style</p>
                <p className="text-sm font-medium capitalize">{brandVoiceProfile.headingStyle}</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2 col-span-2 sm:col-span-3">
                <p className="text-[10px] text-muted-foreground uppercase">Intro Pattern</p>
                <p className="text-sm font-medium">{brandVoiceProfile.introPattern}</p>
              </div>
              {brandVoiceProfile.samplePhrases.length > 0 && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Characteristic Phrases</p>
                  <div className="flex flex-wrap gap-1">
                    {brandVoiceProfile.samplePhrases.slice(0, 8).map((phrase, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{phrase}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[10px] text-muted-foreground">
                  Last analyzed: {new Date(brandVoiceProfile.lastAnalyzed).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No voice profile yet. Publish some content, then click &quot;Analyze Voice&quot; to learn your writing style.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deadlines */}
      <h2 className="text-lg font-semibold mb-3 mt-8">Deadlines</h2>
      <Card>
        <CardContent className="pt-4">
          {deadlines.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{deadlineStatus.onTrack}</p>
                  <p className="text-xs text-muted-foreground">On Track</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">{deadlineStatus.atRisk}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-400">{deadlineStatus.overdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>

              {upcomingDeadlines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Upcoming (7 days)</p>
                  {upcomingDeadlines.slice(0, 8).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${
                          d.status === 'overdue' ? 'text-rose-400 border-rose-500/30' :
                          d.status === 'at-risk' ? 'text-amber-400 border-amber-500/30' :
                          'text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {d.status}
                      </Badge>
                      <span className="truncate flex-1">{d.title}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0">{d.stage}</Badge>
                      <span className="text-muted-foreground shrink-0">
                        {new Date(d.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {deadlineStatus.alerts.length > 0 && (
                <div className="mt-3 space-y-1">
                  {deadlineStatus.alerts.slice(0, 5).map((alert, i) => (
                    <p key={i} className={`text-xs ${alert.startsWith('OVERDUE') ? 'text-rose-400' : 'text-amber-400'}`}>
                      {alert}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No deadlines set. Run the autopilot engine to auto-schedule content deadlines.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
