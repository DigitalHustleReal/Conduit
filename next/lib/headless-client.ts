/**
 * Conduit Headless CMS Client
 *
 * TypeScript SDK for fetching content from Conduit's headless API.
 * Use this in your Next.js app (investingpro.in or any frontend)
 * inside getStaticProps, generateStaticParams, server components, etc.
 *
 * Usage:
 *   import { ConduitClient } from '@/lib/headless-client';
 *   const conduit = new ConduitClient('https://conduit-woad.vercel.app', 'workspace-uuid');
 *   const { data, meta } = await conduit.getContent({ collection: 'Articles', limit: 10 });
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ContentItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  collection: string;
  author: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  keyword: string;
  featuredImage: string;
  seoScore: number;
  aiScore: number;
  wordCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  schema?: SchemaLD;
}

export interface SchemaLD {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  author: { '@type': string; name: string };
  datePublished: string;
  dateModified: string;
  wordCount: number;
  keywords: string;
  image?: string;
}

export interface ContentListMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ContentResponse {
  data: ContentItem[];
  meta: ContentListMeta;
}

export interface SingleContentResponse {
  data: ContentItem;
}

export interface Collection {
  name: string;
  count: number;
}

export interface Keyword {
  keyword: string;
  volume?: number;
  difficulty?: number;
  intent?: string;
  cluster?: string;
}

export interface SitemapEntry {
  slug: string;
  title: string;
  updatedAt: string;
  collection: string;
}

export interface GetContentOptions {
  collection?: string;
  slug?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
  tag?: string;
  keyword?: string;
  fields?: string;
  schema?: boolean;
  status?: string;
}

// ── Client ─────────────────────────────────────────────────────────────

export class ConduitClient {
  private baseUrl: string;
  private workspaceId: string;
  private apiKey: string;
  private defaultHeaders: Record<string, string>;

  /**
   * Create a Conduit headless CMS client.
   *
   * @param baseUrl - The Conduit API base URL (e.g. https://conduit-woad.vercel.app)
   * @param workspaceId - Your Conduit workspace UUID
   * @param apiKey - Optional API key for authenticated requests
   */
  constructor(baseUrl: string, workspaceId: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.workspaceId = workspaceId;
    this.apiKey = apiKey || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
    };
  }

  /**
   * Internal fetch wrapper with error handling.
   */
  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('workspace', this.workspaceId);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.defaultHeaders,
      next: { tags: ['content'] },
    } as RequestInit);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new ConduitError(
        `Conduit API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch a list of content items with filtering, pagination, sorting, and search.
   */
  async getContent(options?: GetContentOptions): Promise<ContentResponse> {
    const params: Record<string, string> = {};

    if (options?.collection) params.collection = options.collection;
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.sort) params.sort = options.sort;
    if (options?.order) params.order = options.order;
    if (options?.q) params.q = options.q;
    if (options?.tag) params.tag = options.tag;
    if (options?.keyword) params.keyword = options.keyword;
    if (options?.fields) params.fields = options.fields;
    if (options?.schema) params.schema = 'true';
    if (options?.status) params.status = options.status;

    return this.request<ContentResponse>('/api/content', params);
  }

  /**
   * Fetch a single content item by slug.
   */
  async getContentBySlug(slug: string): Promise<ContentItem | null> {
    try {
      const res = await this.request<SingleContentResponse>('/api/content', {
        slug,
      });
      return res.data || null;
    } catch (err) {
      if (err instanceof ConduitError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Fetch all unique collections in the workspace.
   * Derives from content list — returns collection names and counts.
   */
  async getCollections(): Promise<Collection[]> {
    const res = await this.request<ContentResponse>('/api/content', {
      fields: 'collection',
      limit: '100',
    });

    const counts: Record<string, number> = {};
    for (const item of res.data) {
      const col = (item as unknown as Record<string, string>).collection || 'Uncategorized';
      counts[col] = (counts[col] || 0) + 1;
    }

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  /**
   * Fetch keywords from the workspace.
   * Note: This requires the keywords to be accessible via a content-adjacent endpoint
   * or you can extend the API. For now, returns keywords extracted from content.
   */
  async getKeywords(): Promise<Keyword[]> {
    const res = await this.request<ContentResponse>('/api/content', {
      fields: 'keyword',
      limit: '100',
    });

    const seen = new Set<string>();
    const keywords: Keyword[] = [];
    for (const item of res.data) {
      const kw = (item as unknown as Record<string, string>).keyword;
      if (kw && !seen.has(kw)) {
        seen.add(kw);
        keywords.push({ keyword: kw });
      }
    }

    return keywords;
  }

  /**
   * Get all published slugs for sitemap generation.
   * Useful in generateStaticParams() or a sitemap.xml route.
   */
  async getSitemap(): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await this.request<ContentResponse>('/api/content', {
        fields: 'slug,title,updatedAt,collection',
        limit: '100',
        page: String(page),
        sort: 'updated_at',
        order: 'desc',
      });

      for (const item of res.data) {
        const raw = item as unknown as Record<string, string>;
        entries.push({
          slug: raw.slug,
          title: raw.title,
          updatedAt: raw.updatedAt,
          collection: raw.collection,
        });
      }

      hasMore = res.meta.hasMore;
      page++;

      // Safety limit
      if (page > 50) break;
    }

    return entries;
  }

  /**
   * Get JSON-LD schema markup for a specific content item.
   */
  async getSchema(slug: string, type?: string): Promise<object | null> {
    const res = await this.request<SingleContentResponse>('/api/content', {
      slug,
      schema: 'true',
    });

    if (!res.data) return null;

    const schema = (res.data as ContentItem).schema;
    if (schema && type) {
      return { ...schema, '@type': type };
    }
    return schema || null;
  }

  /**
   * Get the RSS feed XML as a string.
   */
  async getRSS(collection?: string): Promise<string> {
    const url = new URL(`${this.baseUrl}/api/rss`);
    url.searchParams.set('workspace', this.workspaceId);
    if (collection) url.searchParams.set('collection', collection);

    const response = await fetch(url.toString(), {
      headers: this.defaultHeaders,
    });

    if (!response.ok) {
      throw new ConduitError(
        `RSS feed error: ${response.status}`,
        response.status
      );
    }

    return response.text();
  }
}

// ── Error Class ────────────────────────────────────────────────────────

export class ConduitError extends Error {
  public status: number;
  public responseBody: string;

  constructor(message: string, status: number, responseBody?: string) {
    super(message);
    this.name = 'ConduitError';
    this.status = status;
    this.responseBody = responseBody || '';
  }
}

// ── Factory Helper ─────────────────────────────────────────────────────

/**
 * Create a pre-configured ConduitClient from environment variables.
 *
 * Expects:
 *   CONDUIT_API_URL — Conduit base URL
 *   CONDUIT_WORKSPACE_ID — workspace UUID
 *   CONDUIT_API_KEY — optional API key
 */
export function createConduitClient(): ConduitClient {
  const baseUrl = process.env.CONDUIT_API_URL || process.env.NEXT_PUBLIC_CONDUIT_API_URL || '';
  const workspaceId = process.env.CONDUIT_WORKSPACE_ID || process.env.NEXT_PUBLIC_CONDUIT_WORKSPACE_ID || '';
  const apiKey = process.env.CONDUIT_API_KEY || '';

  if (!baseUrl) throw new Error('Missing CONDUIT_API_URL environment variable');
  if (!workspaceId) throw new Error('Missing CONDUIT_WORKSPACE_ID environment variable');

  return new ConduitClient(baseUrl, workspaceId, apiKey);
}
