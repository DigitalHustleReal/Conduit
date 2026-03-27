import { supabase } from './client';
import type { ContentItem, Collection, Keyword, PipelineItem, MediaItem } from '@/types/content';

// ---------------------------------------------------------------------------
// Load all workspace data from Supabase
// ---------------------------------------------------------------------------

export interface WorkspaceData {
  content: ContentItem[];
  collections: Collection[];
  keywords: Keyword[];
  media: MediaItem[];
  pipeline: PipelineItem[];
}

export async function loadWorkspaceData(workspaceId: string): Promise<WorkspaceData | null> {
  if (!supabase) return null;

  try {
    const [contentRes, collectionsRes, keywordsRes, mediaRes, pipelineRes] = await Promise.all([
      supabase.from('content').select('*').eq('workspace_id', workspaceId),
      supabase.from('collections').select('*').eq('workspace_id', workspaceId),
      supabase.from('keywords').select('*').eq('workspace_id', workspaceId),
      supabase.from('media').select('*').eq('workspace_id', workspaceId),
      supabase.from('pipeline').select('*').eq('workspace_id', workspaceId),
    ]);

    return {
      content: (contentRes.data ?? []).map(mapContentFromDB),
      collections: (collectionsRes.data ?? []).map(mapCollectionFromDB),
      keywords: (keywordsRes.data ?? []).map(mapKeywordFromDB),
      media: (mediaRes.data ?? []).map(mapMediaFromDB),
      pipeline: (pipelineRes.data ?? []).map(mapPipelineFromDB),
    };
  } catch (err) {
    console.warn('[sync] loadWorkspaceData failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sync functions — upsert to Supabase, never crash
// ---------------------------------------------------------------------------

export async function syncContent(workspaceId: string, items: ContentItem[]): Promise<void> {
  if (!supabase || items.length === 0) return;
  try {
    const rows = items.map((item) => mapContentToDB(workspaceId, item));
    const { error } = await supabase.from('content').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[sync] syncContent error:', error.message);
  } catch (err) {
    console.warn('[sync] syncContent failed:', err);
  }
}

export async function syncKeywords(workspaceId: string, items: Keyword[]): Promise<void> {
  if (!supabase || items.length === 0) return;
  try {
    const rows = items.map((item) => mapKeywordToDB(workspaceId, item));
    const { error } = await supabase.from('keywords').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[sync] syncKeywords error:', error.message);
  } catch (err) {
    console.warn('[sync] syncKeywords failed:', err);
  }
}

export async function syncCollections(workspaceId: string, items: Collection[]): Promise<void> {
  if (!supabase || items.length === 0) return;
  try {
    const rows = items.map((item) => mapCollectionToDB(workspaceId, item));
    const { error } = await supabase.from('collections').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[sync] syncCollections error:', error.message);
  } catch (err) {
    console.warn('[sync] syncCollections failed:', err);
  }
}

export async function syncMedia(workspaceId: string, items: MediaItem[]): Promise<void> {
  if (!supabase || items.length === 0) return;
  try {
    const rows = items.map((item) => mapMediaToDB(workspaceId, item));
    const { error } = await supabase.from('media').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[sync] syncMedia error:', error.message);
  } catch (err) {
    console.warn('[sync] syncMedia failed:', err);
  }
}

export async function syncPipeline(workspaceId: string, items: PipelineItem[]): Promise<void> {
  if (!supabase || items.length === 0) return;
  try {
    const rows = items.map((item) => mapPipelineToDB(workspaceId, item));
    const { error } = await supabase.from('pipeline').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[sync] syncPipeline error:', error.message);
  } catch (err) {
    console.warn('[sync] syncPipeline failed:', err);
  }
}

export async function deleteItem(table: string, id: number | string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.warn(`[sync] deleteItem(${table}) error:`, error.message);
  } catch (err) {
    console.warn(`[sync] deleteItem(${table}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

export async function logAudit(
  workspaceId: string,
  userId: string,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action,
      details,
    });
    if (error) console.warn('[sync] logAudit error:', error.message);
  } catch (err) {
    console.warn('[sync] logAudit failed:', err);
  }
}

export async function trackEvent(
  workspaceId: string,
  eventType: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('analytics_events').insert({
      workspace_id: workspaceId,
      event_type: eventType,
      data,
    });
    if (error) console.warn('[sync] trackEvent error:', error.message);
  } catch (err) {
    console.warn('[sync] trackEvent failed:', err);
  }
}

// ---------------------------------------------------------------------------
// DB <-> App mapping helpers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapContentFromDB(row: any): ContentItem {
  return {
    id: typeof row.id === 'string' ? hashId(row.id) : row.id,
    title: row.title ?? '',
    slug: row.slug ?? '',
    body: row.body ?? '',
    content: row.body ?? '',
    collection: row.collection ?? '',
    status: row.status ?? 'draft',
    keyword: row.keyword ?? '',
    metaTitle: row.meta_title ?? '',
    metaDescription: row.meta_description ?? '',
    tags: row.tags ?? [],
    wordCount: row.word_count ?? 0,
    aiScore: row.ai_score ?? 0,
    seoScore: row.seo_score ?? 0,
    featuredImage: row.featured_image ?? '',
    publishDate: row.publish_date ? new Date(row.publish_date).getTime() : undefined,
    created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updated: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

function mapContentToDB(workspaceId: string, item: ContentItem): Record<string, unknown> {
  return {
    id: item.id,
    workspace_id: workspaceId,
    title: item.title,
    slug: item.slug ?? '',
    body: item.body ?? item.content ?? '',
    collection: item.collection ?? '',
    status: item.status,
    keyword: item.keyword ?? '',
    meta_title: item.metaTitle ?? item.seoTitle ?? '',
    meta_description: item.metaDescription ?? item.metaDesc ?? '',
    tags: item.tags ?? [],
    word_count: item.wordCount ?? 0,
    ai_score: item.aiScore ?? 0,
    seo_score: item.seoScore ?? 0,
    featured_image: item.featuredImage ?? '',
    publish_date: item.publishDate ? new Date(item.publishDate).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

function mapCollectionFromDB(row: any): Collection {
  return {
    id: typeof row.id === 'string' ? hashId(row.id) : row.id,
    name: row.name ?? '',
    slug: row.slug ?? '',
    icon: row.icon ?? '',
    description: row.description ?? '',
    fields: row.fields ?? [],
  };
}

function mapCollectionToDB(workspaceId: string, item: Collection): Record<string, unknown> {
  return {
    id: item.id,
    workspace_id: workspaceId,
    name: item.name,
    slug: item.slug,
    icon: item.icon ?? '',
    description: item.description ?? '',
    fields: item.fields ?? [],
  };
}

function mapKeywordFromDB(row: any): Keyword {
  return {
    id: typeof row.id === 'string' ? hashId(row.id) : row.id,
    keyword: row.keyword ?? '',
    volume: row.volume ?? 0,
    difficulty: row.difficulty ?? 0,
    position: row.position ?? 0,
    status: row.status ?? 'tracked',
    trend: row.trend ?? 'stable',
    url: row.url ?? '',
  };
}

function mapKeywordToDB(workspaceId: string, item: Keyword): Record<string, unknown> {
  return {
    id: item.id,
    workspace_id: workspaceId,
    keyword: item.keyword ?? item.term ?? '',
    volume: item.volume ?? 0,
    difficulty: item.difficulty ?? 0,
    position: item.position ?? item.pos ?? 0,
    status: item.status ?? 'tracked',
    trend: item.trend ?? 'stable',
    url: item.url ?? '',
  };
}

function mapMediaFromDB(row: any): MediaItem {
  return {
    id: typeof row.id === 'string' ? hashId(row.id) : row.id,
    name: row.name ?? '',
    url: row.url ?? '',
    type: row.type ?? '',
    size: row.size ?? 0,
    alt: row.alt ?? '',
    source: row.source ?? 'upload',
    metadata: row.metadata ?? {},
    created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapMediaToDB(workspaceId: string, item: MediaItem): Record<string, unknown> {
  return {
    id: item.id,
    workspace_id: workspaceId,
    name: item.name,
    url: item.url,
    type: item.type,
    size: item.size ?? 0,
    alt: item.alt ?? '',
    source: item.source ?? 'upload',
    metadata: item.metadata ?? {},
  };
}

function mapPipelineFromDB(row: any): PipelineItem {
  return {
    id: typeof row.id === 'string' ? hashId(row.id) : row.id,
    title: row.title ?? '',
    stage: row.stage ?? 'backlog',
    assignee: row.assignee ?? '',
    priority: row.priority ?? 'medium',
    keyword: row.keyword ?? '',
    contentId: row.content_id ?? undefined,
    updated: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

function mapPipelineToDB(workspaceId: string, item: PipelineItem): Record<string, unknown> {
  return {
    id: item.id,
    workspace_id: workspaceId,
    title: item.title,
    stage: item.stage,
    assignee: item.assignee ?? '',
    priority: item.priority ?? 'medium',
    keyword: item.keyword ?? '',
    content_id: item.contentId ?? null,
    updated_at: new Date().toISOString(),
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** Deterministic hash for UUID -> numeric id conversion */
function hashId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
