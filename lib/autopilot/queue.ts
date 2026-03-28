/**
 * Universal Review Queue
 *
 * Every agent output goes through this queue.
 * Nothing gets published or applied without user approval (unless auto-approve is ON).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueueItemType =
  | 'keyword'
  | 'content-plan'
  | 'draft'
  | 'seo-fix'
  | 'social-post'
  | 'title-suggestion'
  | 'meta-fix'
  | 'interlink'
  | 'content-refresh';

export type QueueItemStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revised'
  | 'auto-approved';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  title: string;           // human-readable: "New keyword: best mutual funds"
  description: string;     // what the agent wants to do
  agentId: string;         // which agent produced this
  data: Record<string, unknown>; // the actual content/change
  preview?: string;        // markdown preview of what will change
  impact: 'low' | 'medium' | 'high'; // how significant is this action
  status: QueueItemStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewNote?: string;     // user's note on why they rejected/revised
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _counter = 0;

function generateId(): string {
  _counter++;
  return `q_${Date.now()}_${_counter}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Queue operations (pure functions — state lives in Zustand)
// ---------------------------------------------------------------------------

/**
 * Create a new queue item with defaults applied.
 */
export function createQueueItem(
  item: Omit<QueueItem, 'id' | 'status' | 'createdAt'>,
): QueueItem {
  return {
    ...item,
    id: generateId(),
    status: 'pending',
    createdAt: Date.now(),
  };
}

/**
 * Get pending items from a queue array, optionally filtered by type.
 */
export function getPending(
  queue: QueueItem[],
  type?: QueueItemType,
): QueueItem[] {
  return queue.filter(
    (item) =>
      item.status === 'pending' &&
      (type == null || item.type === type),
  );
}

/**
 * Mark an item as approved and return the updated queue.
 */
export function markApproved(
  queue: QueueItem[],
  id: string,
): QueueItem[] {
  return queue.map((item) =>
    item.id === id
      ? { ...item, status: 'approved' as const, reviewedAt: Date.now() }
      : item,
  );
}

/**
 * Mark an item as rejected with an optional reason.
 */
export function markRejected(
  queue: QueueItem[],
  id: string,
  reason?: string,
): QueueItem[] {
  return queue.map((item) =>
    item.id === id
      ? {
          ...item,
          status: 'rejected' as const,
          reviewedAt: Date.now(),
          reviewNote: reason ?? item.reviewNote,
        }
      : item,
  );
}

/**
 * Mark an item as revised — user edited the agent's output.
 */
export function markRevised(
  queue: QueueItem[],
  id: string,
  revisedData: Record<string, unknown>,
): QueueItem[] {
  return queue.map((item) =>
    item.id === id
      ? {
          ...item,
          status: 'revised' as const,
          reviewedAt: Date.now(),
          data: { ...item.data, ...revisedData },
        }
      : item,
  );
}

/**
 * Bulk approve all pending items (optionally filtered by type).
 * Returns the updated queue and count of approved items.
 */
export function bulkApproveItems(
  queue: QueueItem[],
  type?: QueueItemType,
): { queue: QueueItem[]; count: number } {
  let count = 0;
  const now = Date.now();
  const updated = queue.map((item) => {
    if (
      item.status === 'pending' &&
      (type == null || item.type === type)
    ) {
      count++;
      return { ...item, status: 'approved' as const, reviewedAt: now };
    }
    return item;
  });
  return { queue: updated, count };
}

/**
 * Bulk reject all pending items (optionally filtered by type).
 */
export function bulkRejectItems(
  queue: QueueItem[],
  type?: QueueItemType,
  reason?: string,
): { queue: QueueItem[]; count: number } {
  let count = 0;
  const now = Date.now();
  const updated = queue.map((item) => {
    if (
      item.status === 'pending' &&
      (type == null || item.type === type)
    ) {
      count++;
      return {
        ...item,
        status: 'rejected' as const,
        reviewedAt: now,
        reviewNote: reason ?? item.reviewNote,
      };
    }
    return item;
  });
  return { queue: updated, count };
}

/**
 * Get queue statistics.
 */
export function getQueueStats(queue: QueueItem[]): {
  pending: number;
  approved: number;
  rejected: number;
  revised: number;
  byType: Record<string, number>;
} {
  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    revised: 0,
    byType: {} as Record<string, number>,
  };

  for (const item of queue) {
    if (item.status === 'pending') stats.pending++;
    else if (item.status === 'approved' || item.status === 'auto-approved') stats.approved++;
    else if (item.status === 'rejected') stats.rejected++;
    else if (item.status === 'revised') stats.revised++;

    if (item.status === 'pending') {
      stats.byType[item.type] = (stats.byType[item.type] ?? 0) + 1;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Dispatch helpers — execute the approved action on the workspace store
// ---------------------------------------------------------------------------

/**
 * After an item is approved, call this to execute its side-effect.
 * Callers pass the workspace store actions so this file stays decoupled.
 */
export function dispatchApproval(
  item: QueueItem,
  actions: {
    addKeyword: (kw: { id: number; keyword: string; volume: number; difficulty: number; status: 'tracked' | 'opportunity'; trend?: 'up' | 'down' | 'stable' }) => void;
    addContent: (c: Record<string, unknown>) => void;
    updateContentItem: (id: number, updates: Record<string, unknown>) => void;
    addPlannedContent: (plans: Array<Record<string, unknown>>) => void;
  },
): void {
  switch (item.type) {
    case 'keyword': {
      const kw = item.data;
      actions.addKeyword({
        id: Date.now(),
        keyword: (kw.keyword as string) ?? '',
        volume: (kw.volume as number) ?? 0,
        difficulty: (kw.difficulty as number) ?? 50,
        status: 'tracked',
        trend: (kw.trend as 'up' | 'down' | 'stable') ?? 'stable',
      });
      break;
    }

    case 'content-plan': {
      actions.addPlannedContent([item.data as Record<string, unknown>]);
      break;
    }

    case 'draft': {
      const d = item.data;
      actions.addContent({
        id: Date.now(),
        title: (d.title as string) ?? 'Untitled',
        slug: (d.slug as string) ?? '',
        body: (d.body as string) ?? '',
        content: (d.body as string) ?? '',
        keyword: (d.keyword as string) ?? '',
        metaTitle: (d.metaTitle as string) ?? '',
        metaDescription: (d.metaDescription as string) ?? '',
        wordCount: (d.wordCount as number) ?? 0,
        aiScore: (d.aiScore as number) ?? 0,
        seoScore: (d.seoScore as number) ?? 0,
        status: 'review',
        created: Date.now(),
        updated: Date.now(),
      });
      break;
    }

    case 'seo-fix': {
      const contentId = item.data.contentId as number | undefined;
      if (contentId != null) {
        const fixes = { ...item.data };
        delete fixes.contentId;
        actions.updateContentItem(contentId, fixes);
      }
      break;
    }

    case 'title-suggestion': {
      const contentId = item.data.contentId as number | undefined;
      if (contentId != null) {
        actions.updateContentItem(contentId, {
          title: item.data.title as string,
        });
      }
      break;
    }

    case 'meta-fix': {
      const contentId = item.data.contentId as number | undefined;
      if (contentId != null) {
        actions.updateContentItem(contentId, {
          metaTitle: item.data.metaTitle as string,
          metaDescription: item.data.metaDescription as string,
        });
      }
      break;
    }

    case 'content-refresh': {
      const contentId = item.data.contentId as number | undefined;
      if (contentId != null) {
        actions.updateContentItem(contentId, {
          body: item.data.body as string,
          content: item.data.body as string,
          wordCount: item.data.wordCount as number,
          updated: Date.now(),
        });
      }
      break;
    }

    case 'social-post':
      // Social posts are stored in the queue data for external dispatch
      // No direct workspace store action — the social distribution system picks these up
      break;

    case 'interlink':
      // Interlinks are advisory — the user applies them manually via the interlink builder
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Type metadata (for UI)
// ---------------------------------------------------------------------------

export const QUEUE_TYPE_META: Record<
  QueueItemType,
  { label: string; icon: string; color: string; badgeClass: string }
> = {
  keyword: {
    label: 'Keyword',
    icon: '\uD83D\uDD0D',
    color: 'blue',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  'content-plan': {
    label: 'Content Plan',
    icon: '\uD83D\uDCDD',
    color: 'cyan',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  draft: {
    label: 'Draft',
    icon: '\u270D\uFE0F',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  'seo-fix': {
    label: 'SEO Fix',
    icon: '\uD83D\uDD27',
    color: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  'social-post': {
    label: 'Social Post',
    icon: '\uD83D\uDCE2',
    color: 'violet',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
  'title-suggestion': {
    label: 'Title',
    icon: '\uD83D\uDCCB',
    color: 'pink',
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
  'meta-fix': {
    label: 'Meta Fix',
    icon: '\uD83C\uDFF7\uFE0F',
    color: 'orange',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
  interlink: {
    label: 'Interlink',
    icon: '\uD83D\uDD17',
    color: 'teal',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  },
  'content-refresh': {
    label: 'Refresh',
    icon: '\u267B\uFE0F',
    color: 'lime',
    badgeClass: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
  },
};

export const QUEUE_IMPACT_META: Record<
  'low' | 'medium' | 'high',
  { label: string; badgeClass: string }
> = {
  low: { label: 'Low', badgeClass: 'bg-muted text-muted-foreground border-border' },
  medium: { label: 'Medium', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high: { label: 'High', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};
