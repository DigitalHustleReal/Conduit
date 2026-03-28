/**
 * Seed Data Parser & Processor
 *
 * Parse user-uploaded seed data (keywords, titles, topics, briefs) from
 * Ahrefs, SEMrush, Google Keyword Planner, custom CSVs, JSON, or plain text
 * and feed it into the autopilot engine as starting material.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeedKeyword {
  keyword: string;
  volume?: number;
  difficulty?: number;
  cpc?: number;
  intent?: string;
  source: string; // 'csv-upload' | 'manual' | 'ahrefs' | 'semrush' | 'gkp' | 'json-upload' | 'text-upload'
}

export interface ContentBrief {
  title: string;
  keyword: string;
  outline?: string[];
  notes?: string;
  targetWordCount?: number;
}

export interface SeedData {
  keywords: SeedKeyword[];
  titles: string[];
  topics: string[];
  briefs: ContentBrief[];
}

export interface MergeResult {
  newKeywords: SeedKeyword[];
  newTitles: string[];
  duplicatesSkipped: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Strip UTF-8 BOM and normalize line endings. */
function cleanInput(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Trim whitespace and surrounding quotes from a cell value. */
function trimCell(v: string): string {
  let s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  // Handle escaped double-quotes inside CSV fields
  s = s.replace(/""/g, '"');
  return s;
}

/** Try to parse a number from a string, ignoring commas and currency symbols. */
function parseNum(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/[$,\s]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return undefined;
  const n = Number(cleaned);
  return isFinite(n) ? n : undefined;
}

/** Detect delimiter (comma, tab, semicolon, pipe). */
function detectDelimiter(line: string): string {
  // Count occurrences outside of quoted fields
  const counts: Record<string, number> = { '\t': 0, ',': 0, ';': 0, '|': 0 };
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (!inQuote && ch in counts) {
      counts[ch]++;
    }
  }
  // Pick the one with the highest count (prefer tab > comma > semicolon > pipe)
  let best = ',';
  let bestCount = 0;
  for (const [d, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestCount = c;
      best = d;
    }
  }
  return best;
}

/**
 * Split a CSV line respecting quoted fields.
 * Handles fields like: "value with, comma","another"
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuote = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === delimiter) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Normalise a header name for matching. */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Map a normalised header name to a known field. */
type FieldName = 'keyword' | 'volume' | 'difficulty' | 'cpc' | 'intent' | 'title' | 'topic';

const HEADER_MAP: Record<string, FieldName> = {
  // Keywords
  keyword: 'keyword',
  keywords: 'keyword',
  term: 'keyword',
  searchterm: 'keyword',
  query: 'keyword',
  // Volume
  volume: 'volume',
  searchvolume: 'volume',
  avgmonthlysearches: 'volume',
  monthlysearches: 'volume',
  msv: 'volume',
  sv: 'volume',
  // Difficulty
  difficulty: 'difficulty',
  kd: 'difficulty',
  keyworddifficulty: 'difficulty',
  sd: 'difficulty',
  seodifficulty: 'difficulty',
  competition: 'difficulty',
  // CPC
  cpc: 'cpc',
  costperclick: 'cpc',
  // Intent
  intent: 'intent',
  searchintent: 'intent',
  // Title
  title: 'title',
  pagetitle: 'title',
  articletitle: 'title',
  // Topic
  topic: 'topic',
  topics: 'topic',
  category: 'topic',
  cluster: 'topic',
};

/**
 * Detect the source tool from headers.
 * Returns a human-readable source string.
 */
function detectSource(headers: string[]): string {
  const norm = headers.map(normalizeHeader);
  // Ahrefs typically has: Keyword, Volume, KD, CPC, ...
  if (norm.includes('kd') && norm.includes('volume')) return 'ahrefs';
  // SEMrush: Keyword, Search Volume, Keyword Difficulty, CPC, ...
  if (norm.some((h) => h.includes('keyworddifficulty'))) return 'semrush';
  // Google Keyword Planner: Keyword, Avg. monthly searches, Competition
  if (norm.some((h) => h.includes('avgmonthlysearches')) || norm.some((h) => h.includes('competition'))) return 'gkp';
  return 'csv-upload';
}

/** Map competition strings from GKP to numeric difficulty. */
function competitionToDifficulty(v: string): number | undefined {
  const low = v.toLowerCase().trim();
  if (low === 'low') return 25;
  if (low === 'medium') return 50;
  if (low === 'high') return 75;
  // Try numeric
  const n = parseNum(v);
  if (n !== undefined) return Math.min(100, Math.max(0, n));
  return undefined;
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

/**
 * Parse CSV text -- auto-detect columns, delimiter, and source tool.
 * Handles common exports from Ahrefs, SEMrush, and Google Keyword Planner.
 */
export function parseCSVSeeds(csvText: string): SeedData {
  const cleaned = cleanInput(csvText);
  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { keywords: [], titles: [], topics: [], briefs: [] };

  const delimiter = detectDelimiter(lines[0]);

  // Try to detect headers from first line
  const firstLineFields = splitCSVLine(lines[0], delimiter).map(trimCell);
  const normHeaders = firstLineFields.map(normalizeHeader);

  // Check if first line looks like headers
  const hasHeaders = normHeaders.some((h) => Object.keys(HEADER_MAP).includes(h));

  let headers: string[];
  let dataStart: number;

  if (hasHeaders) {
    headers = firstLineFields;
    dataStart = 1;
  } else {
    // No headers: treat first column as keyword
    headers = ['keyword'];
    dataStart = 0;
  }

  const source = detectSource(headers);
  const fieldIndices: Partial<Record<FieldName, number>> = {};

  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeader(headers[i]);
    const field = HEADER_MAP[norm];
    if (field && fieldIndices[field] === undefined) {
      fieldIndices[field] = i;
    }
  }

  const keywords: SeedKeyword[] = [];
  const titles: string[] = [];
  const topics: string[] = [];

  for (let i = dataStart; i < lines.length; i++) {
    const fields = splitCSVLine(lines[i], delimiter).map(trimCell);
    if (fields.every((f) => f === '')) continue; // skip blank rows

    // Extract keyword
    const kwIdx = fieldIndices.keyword;
    const kw = kwIdx !== undefined ? fields[kwIdx] : fields[0];
    if (kw && kw.trim()) {
      const volIdx = fieldIndices.volume;
      const diffIdx = fieldIndices.difficulty;
      const cpcIdx = fieldIndices.cpc;
      const intentIdx = fieldIndices.intent;

      let difficulty = diffIdx !== undefined ? parseNum(fields[diffIdx]) : undefined;
      // GKP uses text-based competition
      if (difficulty === undefined && diffIdx !== undefined && fields[diffIdx]) {
        difficulty = competitionToDifficulty(fields[diffIdx]);
      }

      keywords.push({
        keyword: kw.trim(),
        volume: volIdx !== undefined ? parseNum(fields[volIdx]) : undefined,
        difficulty,
        cpc: cpcIdx !== undefined ? parseNum(fields[cpcIdx]) : undefined,
        intent: intentIdx !== undefined ? fields[intentIdx]?.trim() || undefined : undefined,
        source,
      });
    }

    // Extract title if separate column
    const titleIdx = fieldIndices.title;
    if (titleIdx !== undefined && fields[titleIdx]?.trim()) {
      titles.push(fields[titleIdx].trim());
    }

    // Extract topic if separate column
    const topicIdx = fieldIndices.topic;
    if (topicIdx !== undefined && fields[topicIdx]?.trim()) {
      const t = fields[topicIdx].trim();
      if (!topics.includes(t)) topics.push(t);
    }
  }

  return { keywords, titles, topics, briefs: [] };
}

// ---------------------------------------------------------------------------
// JSON Parser
// ---------------------------------------------------------------------------

/**
 * Parse JSON -- accepts arrays of strings (treated as keywords) or objects.
 */
export function parseJSONSeeds(jsonText: string): SeedData {
  const cleaned = cleanInput(jsonText).trim();
  const keywords: SeedKeyword[] = [];
  const titles: string[] = [];
  const topics: string[] = [];
  const briefs: ContentBrief[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { keywords: [], titles: [], topics: [], briefs: [] };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];

  for (const item of items) {
    if (typeof item === 'string') {
      // Plain string array -> keywords
      if (item.trim()) {
        keywords.push({ keyword: item.trim(), source: 'json-upload' });
      }
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;

      // Try to extract keyword
      const kw = (obj.keyword || obj.term || obj.query || obj.Keyword || obj.Term || '') as string;
      if (kw && typeof kw === 'string' && kw.trim()) {
        keywords.push({
          keyword: kw.trim(),
          volume: typeof obj.volume === 'number' ? obj.volume : parseNum(String(obj.volume ?? obj.Volume ?? obj.search_volume ?? obj.searchVolume ?? '')),
          difficulty: typeof obj.difficulty === 'number' ? obj.difficulty : parseNum(String(obj.difficulty ?? obj.Difficulty ?? obj.kd ?? obj.KD ?? '')),
          cpc: typeof obj.cpc === 'number' ? obj.cpc : parseNum(String(obj.cpc ?? obj.CPC ?? '')),
          intent: typeof obj.intent === 'string' ? obj.intent : undefined,
          source: 'json-upload',
        });
      }

      // Try to extract title
      const title = (obj.title || obj.Title || '') as string;
      if (title && typeof title === 'string' && title.trim()) {
        titles.push(title.trim());
      }

      // Try to extract topic
      const topic = (obj.topic || obj.Topic || obj.category || obj.cluster || '') as string;
      if (topic && typeof topic === 'string' && topic.trim() && !topics.includes(topic.trim())) {
        topics.push(topic.trim());
      }

      // Try to extract brief
      if (title && kw && (obj.outline || obj.notes || obj.targetWordCount)) {
        briefs.push({
          title: title.trim(),
          keyword: kw.trim(),
          outline: Array.isArray(obj.outline) ? (obj.outline as string[]) : undefined,
          notes: typeof obj.notes === 'string' ? obj.notes : undefined,
          targetWordCount: typeof obj.targetWordCount === 'number' ? obj.targetWordCount : undefined,
        });
      }
    }
  }

  return { keywords, titles, topics, briefs };
}

// ---------------------------------------------------------------------------
// Plain Text Parser
// ---------------------------------------------------------------------------

/**
 * Parse plain text: one keyword/title per line.
 */
export function parsePlainTextSeeds(text: string): SeedData {
  const cleaned = cleanInput(text);
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const keywords: SeedKeyword[] = lines.map((line) => ({
    keyword: line,
    source: 'text-upload',
  }));

  return { keywords, titles: [], topics: [], briefs: [] };
}

// ---------------------------------------------------------------------------
// Auto-detect & Parse
// ---------------------------------------------------------------------------

/**
 * Auto-detect format and parse the input.
 */
export function parseSeedData(input: string, format?: 'csv' | 'json' | 'text'): SeedData {
  const trimmed = cleanInput(input).trim();
  if (!trimmed) return { keywords: [], titles: [], topics: [], briefs: [] };

  if (format === 'csv') return parseCSVSeeds(trimmed);
  if (format === 'json') return parseJSONSeeds(trimmed);
  if (format === 'text') return parsePlainTextSeeds(trimmed);

  // Auto-detect
  // JSON starts with [ or {
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return parseJSONSeeds(trimmed);
    } catch {
      // Not valid JSON, fall through
    }
  }

  // CSV: check if the first line has known delimiters and at least 2 fields
  const firstLine = trimmed.split('\n')[0];
  const delimiter = detectDelimiter(firstLine);
  const fieldCount = splitCSVLine(firstLine, delimiter).length;

  if (fieldCount >= 2) {
    return parseCSVSeeds(trimmed);
  }

  // Default: plain text
  return parsePlainTextSeeds(trimmed);
}

/**
 * Detect the likely format of the input string.
 */
export function detectFormat(input: string): 'csv' | 'json' | 'text' {
  const trimmed = cleanInput(input).trim();
  if (!trimmed) return 'text';

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // fall through
    }
  }

  const firstLine = trimmed.split('\n')[0];
  const delimiter = detectDelimiter(firstLine);
  const fieldCount = splitCSVLine(firstLine, delimiter).length;
  if (fieldCount >= 2) return 'csv';

  return 'text';
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * Merge seed data into autopilot state. Deduplicates and tracks sources.
 */
export function mergeSeedsIntoState(
  seeds: SeedData,
  existingKeywords: string[],
): MergeResult {
  const existingLower = new Set(existingKeywords.map((k) => k.toLowerCase()));
  let duplicatesSkipped = 0;

  const newKeywords: SeedKeyword[] = [];
  const seenInBatch = new Set<string>();

  for (const kw of seeds.keywords) {
    const lower = kw.keyword.toLowerCase();
    if (existingLower.has(lower) || seenInBatch.has(lower)) {
      duplicatesSkipped++;
    } else {
      newKeywords.push(kw);
      seenInBatch.add(lower);
    }
  }

  // Titles that aren't just duplicate keywords
  const newTitles = seeds.titles.filter((t) => {
    const lower = t.toLowerCase();
    return !existingLower.has(lower) && !seenInBatch.has(lower);
  });

  return {
    newKeywords,
    newTitles,
    duplicatesSkipped,
  };
}

// ---------------------------------------------------------------------------
// Template generators
// ---------------------------------------------------------------------------

export function generateCSVTemplate(format: 'ahrefs' | 'semrush' | 'simple'): string {
  switch (format) {
    case 'ahrefs':
      return 'Keyword,Volume,KD,CPC,Intent\nbest credit cards,12000,85,3.50,commercial\nhow to save money,8500,35,0.80,informational';
    case 'semrush':
      return 'Keyword,Search Volume,Keyword Difficulty,CPC,Intent\nbest credit cards,12000,85,3.50,commercial\nhow to save money,8500,35,0.80,informational';
    case 'simple':
      return 'Keyword\nbest credit cards\nhow to save money\npersonal finance tips\nbudgeting for beginners';
    default:
      return 'Keyword\n';
  }
}
