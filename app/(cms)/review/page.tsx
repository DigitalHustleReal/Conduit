'use client';

import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { QueueItem, QueueItemType } from '@/lib/autopilot/queue';
import { getPending, getQueueStats, QUEUE_TYPE_META, QUEUE_IMPACT_META } from '@/lib/autopilot/queue';

/* ─── Filter tabs ──────────────────────────────────────────── */

const FILTER_TABS: Array<{ key: QueueItemType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'keyword', label: 'Keywords' },
  { key: 'draft', label: 'Drafts' },
  { key: 'seo-fix', label: 'SEO Fixes' },
  { key: 'social-post', label: 'Social' },
  { key: 'content-plan', label: 'Plans' },
  { key: 'meta-fix', label: 'Meta' },
  { key: 'title-suggestion', label: 'Titles' },
  { key: 'interlink', label: 'Links' },
  { key: 'content-refresh', label: 'Refresh' },
];

/* ─── Helpers ──────────────────────────────────────────────── */

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

/* ─── Queue Item Card ──────────────────────────────────────── */

function QueueItemCard({
  item,
  onApprove,
  onReject,
  onEdit,
  isSelected,
}: {
  item: QueueItem;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  isSelected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionTaken, setActionTaken] = useState(false);
  const meta = QUEUE_TYPE_META[item.type];
  const impactMeta = QUEUE_IMPACT_META[item.impact];

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20'
          : 'border-border bg-card/80 hover:border-border/80 hover:bg-card'
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Left: type icon + badge */}
        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
          <span className="text-xl">{meta?.icon ?? '\u2726'}</span>
          <Badge variant="outline" className={`text-[9px] ${meta?.badgeClass ?? ''}`}>
            {meta?.label ?? item.type}
          </Badge>
        </div>

        {/* Middle: title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
              {item.title}
            </h3>
            <Badge variant="outline" className={`text-[8px] shrink-0 ${impactMeta?.badgeClass ?? ''}`}>
              {impactMeta?.label ?? item.impact}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {item.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              {relativeTime(item.createdAt)}
            </span>
            <span className="text-[10px] text-muted-foreground/40">
              {item.agentId}
            </span>
            {item.preview && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                {expanded ? 'Collapse' : 'Preview'}
              </button>
            )}
          </div>

          {/* Expanded preview */}
          {expanded && item.preview && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {item.preview}
            </div>
          )}

          {/* Before/after for SEO fixes */}
          {expanded && item.type === 'seo-fix' && item.data && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {!!item.data.oldTitle && (
                <>
                  <div className="p-2 rounded bg-rose-500/5 border border-rose-500/20">
                    <div className="text-[9px] uppercase tracking-wider text-rose-400 mb-1">Before</div>
                    <div className="text-xs text-muted-foreground">{String(item.data.oldTitle)}</div>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                    <div className="text-[9px] uppercase tracking-wider text-emerald-400 mb-1">After</div>
                    <div className="text-xs text-foreground">{String(item.data.title ?? item.data.metaTitle ?? '')}</div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reject reason input */}
          {rejecting && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional)..."
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onReject();
                    setRejecting(false);
                    setRejectReason('');
                  }
                  if (e.key === 'Escape') {
                    setRejecting(false);
                    setRejectReason('');
                  }
                }}
              />
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => {
                  onReject();
                  setRejecting(false);
                  setRejectReason('');
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setRejecting(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="shrink-0 flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={actionTaken}
            onClick={() => {
              setActionTaken(true);
              onApprove();
            }}
            title="Approve (A)"
          >
            {actionTaken ? 'Done' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 px-3 text-xs"
            disabled={actionTaken}
            onClick={() => {
              if (rejecting) {
                setActionTaken(true);
                onReject();
                setRejecting(false);
              } else {
                setRejecting(true);
              }
            }}
            title="Reject (R)"
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs border-border hover:border-blue-500/50"
            onClick={onEdit}
            title="Edit (E)"
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */

export default function ReviewQueuePage() {
  const {
    reviewQueue,
    approveItem,
    rejectItem,
    bulkApproveQueue,
    bulkRejectQueue,
  } = useWorkspace();

  const [activeFilter, setActiveFilter] = useState<QueueItemType | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const stats = useMemo(() => getQueueStats(reviewQueue), [reviewQueue]);

  const pendingItems = useMemo(() => {
    return getPending(
      reviewQueue,
      activeFilter === 'all' ? undefined : activeFilter,
    );
  }, [reviewQueue, activeFilter]);

  const recentApproved = useMemo(() => {
    return reviewQueue
      .filter((q) => q.status === 'approved' || q.status === 'auto-approved')
      .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0))
      .slice(0, 3);
  }, [reviewQueue]);

  const todayApproved = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return reviewQueue.filter(
      (q) =>
        (q.status === 'approved' || q.status === 'auto-approved') &&
        (q.reviewedAt ?? 0) >= dayStart.getTime(),
    ).length;
  }, [reviewQueue]);

  const todayRejected = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return reviewQueue.filter(
      (q) => q.status === 'rejected' && (q.reviewedAt ?? 0) >= dayStart.getTime(),
    ).length;
  }, [reviewQueue]);

  // Ensure selected index stays in bounds
  useEffect(() => {
    if (selectedIndex >= pendingItems.length && pendingItems.length > 0) {
      setSelectedIndex(Math.max(0, pendingItems.length - 1));
    }
  }, [pendingItems.length, selectedIndex]);

  const handleApprove = useCallback(
    (id: string) => {
      approveItem(id);
      toast.success('Approved');
    },
    [approveItem],
  );

  const handleReject = useCallback(
    (id: string, reason?: string) => {
      rejectItem(id, reason);
      toast('Rejected', { description: reason || undefined });
    },
    [rejectItem],
  );

  const handleBulkApprove = useCallback(
    (type?: QueueItemType) => {
      const count = bulkApproveQueue(type);
      toast.success(`Approved ${count} items`);
    },
    [bulkApproveQueue],
  );

  const handleBulkReject = useCallback(
    (type?: QueueItemType) => {
      const count = bulkRejectQueue(type, 'Bulk rejected');
      toast(`Rejected ${count} items`);
    },
    [bulkRejectQueue],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const item = pendingItems[selectedIndex];

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (item) handleApprove(item.id);
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (item) handleReject(item.id);
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, pendingItems.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, pendingItems.length - 1));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingItems, selectedIndex, handleApprove, handleReject]);

  // Count pending by type for filter badges
  const pendingByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of reviewQueue) {
      if (item.status === 'pending') {
        counts[item.type] = (counts[item.type] ?? 0) + 1;
      }
    }
    return counts;
  }, [reviewQueue]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approve, reject, or edit agent outputs before they go live
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">A</kbd>
          <span>approve</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">R</kbd>
          <span>reject</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">&darr;</kbd>
          <span>next</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 p-3 rounded-xl bg-card/80 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-amber-400">{stats.pending}</span>
          <span className="text-xs text-muted-foreground">pending</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-emerald-400">{todayApproved}</span>
          <span className="text-xs text-muted-foreground">approved today</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-rose-400">{todayRejected}</span>
          <span className="text-xs text-muted-foreground">rejected</span>
        </div>

        <div className="flex-1" />

        {/* Bulk actions */}
        {stats.pending > 0 && (
          <div className="flex items-center gap-2">
            {(stats.byType['keyword'] ?? 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                onClick={() => handleBulkApprove('keyword')}
              >
                Approve All Keywords ({stats.byType['keyword']})
              </Button>
            )}
            {(stats.byType['seo-fix'] ?? 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => handleBulkApprove('seo-fix')}
              >
                Approve All SEO Fixes ({stats.byType['seo-fix']})
              </Button>
            )}
            {stats.pending > 3 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => handleBulkApprove(activeFilter === 'all' ? undefined : activeFilter)}
              >
                Approve All ({activeFilter === 'all' ? stats.pending : pendingItems.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === 'all' ? stats.pending : (pendingByType[tab.key] ?? 0);
          if (tab.key !== 'all' && count === 0) return null;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveFilter(tab.key);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 font-mono text-[10px] opacity-70">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Queue items */}
      {pendingItems.length > 0 ? (
        <div className="space-y-2">
          {pendingItems.map((item, i) => (
            <QueueItemCard
              key={item.id}
              item={item}
              isSelected={i === selectedIndex}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onEdit={() => {
                // For drafts, navigate to editor (placeholder — just expand for now)
                toast('Edit mode', { description: `Editing ${item.type}: ${item.title}` });
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <Card className="bg-card/80 backdrop-blur border-border">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-3xl">{'\\u2713'}</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                All caught up!
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Your agents are working. New items will appear here when they have suggestions ready for your review.
              </p>

              {/* Recent approved as proof of agent activity */}
              {recentApproved.length > 0 && (
                <div className="max-w-md mx-auto">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-3">
                    Recently approved
                  </div>
                  <div className="space-y-2">
                    {recentApproved.map((item) => {
                      const meta = QUEUE_TYPE_META[item.type];
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border text-left"
                        >
                          <span className="text-sm">{meta?.icon ?? '\u2726'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">{item.title}</p>
                            <span className="text-[10px] text-muted-foreground/50">
                              {item.reviewedAt ? relativeTime(item.reviewedAt) : ''}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Approved
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
