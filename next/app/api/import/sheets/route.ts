import { NextResponse } from 'next/server';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

interface SheetMapping {
  [column: string]: string; // e.g. { A: 'title', B: 'keyword', C: 'status', D: 'body' }
}

function columnLetterToIndex(letter: string): number {
  let index = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1; // 0-based
}

function mapStatus(raw: string | undefined): 'draft' | 'review' | 'published' {
  if (!raw) return 'draft';
  const lower = raw.toLowerCase().trim();
  if (lower === 'published' || lower === 'done' || lower === 'live') return 'published';
  if (lower === 'review' || lower === 'in review' || lower === 'editing') return 'review';
  return 'draft';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      spreadsheetId?: string;
      range?: string;
      mapping?: SheetMapping;
      googleToken?: string;
      preview?: boolean;
    };

    const { spreadsheetId, range = 'Sheet1', mapping, googleToken } = body;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'spreadsheetId is required' }, { status: 400 });
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      return NextResponse.json({ error: 'Column mapping is required' }, { status: 400 });
    }

    // Use provided Google token, workspace token, or service API key
    const token = googleToken || process.env.GOOGLE_ACCESS_TOKEN;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

    const headers: Record<string, string> = {};
    let url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (apiKey) {
      url += `?key=${apiKey}`;
    } else {
      return NextResponse.json(
        { error: 'Google authentication required. Provide googleToken or configure GOOGLE_SHEETS_API_KEY.' },
        { status: 400 },
      );
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Sheets API error:', errText);
      return NextResponse.json(
        { error: `Google Sheets API error: ${res.status}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as { values?: string[][] };
    const rows = data.values ?? [];

    if (rows.length < 2) {
      return NextResponse.json({ items: [], count: 0 });
    }

    // First row is headers, rest are data
    const dataRows = body.preview ? rows.slice(1, 6) : rows.slice(1);

    const items = dataRows.map((row, index) => {
      const getValue = (field: string): string => {
        // Find which column maps to this field
        for (const [col, fieldName] of Object.entries(mapping)) {
          if (fieldName === field) {
            const colIndex = columnLetterToIndex(col);
            return row[colIndex] ?? '';
          }
        }
        return '';
      };

      const title = getValue('title') || `Imported Row ${index + 1}`;
      const bodyText = getValue('body') || '';
      const keyword = getValue('keyword') || '';
      const statusRaw = getValue('status');
      const tagsRaw = getValue('tags');
      const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      return {
        id: Date.now() + index,
        title,
        body: bodyText,
        content: bodyText,
        keyword,
        status: mapStatus(statusRaw),
        tags,
        wordCount,
        aiScore: 0,
        seoScore: 0,
        created: Date.now(),
        updated: Date.now(),
        _importSource: 'sheets',
      };
    });

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error('Sheets import error:', err);
    return NextResponse.json({ error: 'Failed to import from Google Sheets' }, { status: 500 });
  }
}
