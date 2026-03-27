import type { ContentItem } from '@/types/content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportSource = 'notion' | 'sheets' | 'csv' | 'json';

export interface ImportMapping {
  [sourceField: string]: string; // source key/column -> Conduit field name
}

export interface ImportResult {
  items: ContentItem[];
  count: number;
  source: ImportSource;
  error?: string;
}

export interface ImportHistoryEntry {
  id: number;
  source: ImportSource;
  count: number;
  date: number;
  label?: string;
}

// ---------------------------------------------------------------------------
// Notion import (server-side API call)
// ---------------------------------------------------------------------------

export async function importFromNotion(
  databaseId: string,
  notionToken?: string,
  preview = false,
): Promise<ImportResult> {
  const res = await fetch('/api/import/notion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ databaseId, notionToken, preview }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { items: [], count: 0, source: 'notion', error: err.error ?? `HTTP ${res.status}` };
  }

  const data = (await res.json()) as { items: ContentItem[]; count: number };
  return { ...data, source: 'notion' };
}

// ---------------------------------------------------------------------------
// Google Sheets import (server-side API call)
// ---------------------------------------------------------------------------

export async function importFromSheets(
  spreadsheetId: string,
  range: string,
  mapping: ImportMapping,
  googleToken?: string,
  preview = false,
): Promise<ImportResult> {
  const res = await fetch('/api/import/sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId, range, mapping, googleToken, preview }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { items: [], count: 0, source: 'sheets', error: err.error ?? `HTTP ${res.status}` };
  }

  const data = (await res.json()) as { items: ContentItem[]; count: number };
  return { ...data, source: 'sheets' };
}

// ---------------------------------------------------------------------------
// CSV import (client-side only, no API needed)
// ---------------------------------------------------------------------------

export function importFromCSV(csvText: string): ImportResult {
  try {
    const lines = parseCSVLines(csvText);
    if (lines.length < 2) {
      return { items: [], count: 0, source: 'csv', error: 'CSV must have a header row and at least one data row.' };
    }

    const headers = lines[0];
    const rows = lines.slice(1).filter((row) => row.some((cell) => cell.trim()));

    const items = rows.map((row, index) => {
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        record[header.trim()] = row[i]?.trim() ?? '';
      });
      return record;
    }).map((record, index) =>
      mapRawToContent(record, index, 'csv'),
    );

    return { items, count: items.length, source: 'csv' };
  } catch {
    return { items: [], count: 0, source: 'csv', error: 'Failed to parse CSV.' };
  }
}

function parseCSVLines(csv: string): string[][] {
  const result: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuote = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field);
        field = '';
        result.push(current);
        current = [];
        if (ch === '\r') i++; // skip \n after \r
      } else if (ch === '\r') {
        current.push(field);
        field = '';
        result.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }

  // Push last field/row
  if (field || current.length > 0) {
    current.push(field);
    result.push(current);
  }

  return result;
}

// ---------------------------------------------------------------------------
// JSON import (client-side only, no API needed)
// ---------------------------------------------------------------------------

export function importFromJSON(jsonText: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];

    if (arr.length === 0) {
      return { items: [], count: 0, source: 'json', error: 'JSON array is empty.' };
    }

    const items = arr.map((entry, index) => {
      const record: Record<string, string> = {};
      if (typeof entry === 'object' && entry !== null) {
        for (const [key, val] of Object.entries(entry as Record<string, unknown>)) {
          record[key] = typeof val === 'string' ? val : JSON.stringify(val);
        }
      }
      return mapRawToContent(record, index, 'json');
    });

    return { items, count: items.length, source: 'json' };
  } catch {
    return { items: [], count: 0, source: 'json', error: 'Invalid JSON format.' };
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

export function mapImportedToContent(
  rows: Record<string, string>[],
  mapping: ImportMapping,
  source: ImportSource = 'csv',
): ContentItem[] {
  return rows.map((row, index) => {
    const mapped: Record<string, string> = {};
    for (const [sourceKey, targetField] of Object.entries(mapping)) {
      if (row[sourceKey] !== undefined) {
        mapped[targetField] = row[sourceKey];
      }
    }
    return mapRawToContent(mapped, index, source);
  });
}

function mapRawToContent(
  record: Record<string, string>,
  index: number,
  source: ImportSource,
): ContentItem {
  const title = record.title || record.Title || record.name || record.Name || `Imported Item ${index + 1}`;
  const body = record.body || record.Body || record.content || record.Content || record.text || record.Text || '';
  const keyword = record.keyword || record.Keyword || record.focus_keyword || '';
  const statusRaw = record.status || record.Status || '';
  const tagsRaw = record.tags || record.Tags || '';
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  let status: ContentItem['status'] = 'draft';
  const lower = statusRaw.toLowerCase().trim();
  if (lower === 'published' || lower === 'done' || lower === 'live') status = 'published';
  else if (lower === 'review' || lower === 'in review' || lower === 'editing') status = 'review';

  return {
    id: Date.now() + index,
    title,
    body,
    content: body,
    keyword,
    status,
    tags,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    wordCount,
    aiScore: 0,
    seoScore: 0,
    created: Date.now(),
    updated: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// CSV header / JSON key detection for auto-mapping UI
// ---------------------------------------------------------------------------

export function detectCSVHeaders(csvText: string): string[] {
  const lines = parseCSVLines(csvText);
  return lines.length > 0 ? lines[0].map((h) => h.trim()) : [];
}

export function detectJSONKeys(jsonText: string): string[] {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) return [];
    const first = arr[0] as Record<string, unknown>;
    return typeof first === 'object' && first !== null ? Object.keys(first) : [];
  } catch {
    return [];
  }
}

export function getCSVPreviewRows(csvText: string, max = 5): Record<string, string>[] {
  const lines = parseCSVLines(csvText);
  if (lines.length < 2) return [];
  const headers = lines[0].map((h) => h.trim());
  return lines.slice(1, 1 + max).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = row[i]?.trim() ?? '';
    });
    return record;
  });
}

export function getJSONPreviewRows(jsonText: string, max = 5): Record<string, string>[] {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.slice(0, max).map((entry) => {
      const record: Record<string, string> = {};
      if (typeof entry === 'object' && entry !== null) {
        for (const [key, val] of Object.entries(entry as Record<string, unknown>)) {
          record[key] = typeof val === 'string' ? val : JSON.stringify(val);
        }
      }
      return record;
    });
  } catch {
    return [];
  }
}

// Conduit content fields that can be mapped to
export const CONDUIT_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'body', label: 'Body / Content' },
  { value: 'keyword', label: 'Focus Keyword' },
  { value: 'status', label: 'Status' },
  { value: 'tags', label: 'Tags' },
  { value: 'slug', label: 'Slug' },
  { value: 'metaTitle', label: 'Meta Title' },
  { value: 'metaDescription', label: 'Meta Description' },
  { value: 'excerpt', label: 'Excerpt' },
  { value: 'collection', label: 'Collection' },
  { value: 'author', label: 'Author' },
  { value: '', label: '-- Skip --' },
] as const;
