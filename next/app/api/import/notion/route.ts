import { NextResponse } from 'next/server';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionRichText {
  plain_text: string;
}

interface NotionProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  status?: { name: string } | null;
  date?: { start: string } | null;
  created_time?: string;
  url?: string | null;
  number?: number | null;
  checkbox?: boolean;
}

interface NotionPage {
  id: string;
  created_time: string;
  properties: Record<string, NotionProperty>;
}

interface NotionBlock {
  type: string;
  paragraph?: { rich_text: NotionRichText[] };
  heading_1?: { rich_text: NotionRichText[] };
  heading_2?: { rich_text: NotionRichText[] };
  heading_3?: { rich_text: NotionRichText[] };
  bulleted_list_item?: { rich_text: NotionRichText[] };
  numbered_list_item?: { rich_text: NotionRichText[] };
  to_do?: { rich_text: NotionRichText[]; checked: boolean };
  code?: { rich_text: NotionRichText[]; language: string };
  quote?: { rich_text: NotionRichText[] };
  divider?: object;
  image?: { type: string; file?: { url: string }; external?: { url: string } };
}

function extractPlainText(richText: NotionRichText[] | undefined): string {
  if (!richText) return '';
  return richText.map((t) => t.plain_text).join('');
}

function mapNotionStatus(status: string | undefined): 'draft' | 'review' | 'published' {
  if (!status) return 'draft';
  const lower = status.toLowerCase();
  if (lower === 'published' || lower === 'done' || lower === 'complete') return 'published';
  if (lower === 'in review' || lower === 'review' || lower === 'in progress') return 'review';
  return 'draft';
}

function blocksToMarkdown(blocks: NotionBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        lines.push(extractPlainText(block.paragraph?.rich_text));
        lines.push('');
        break;
      case 'heading_1':
        lines.push(`# ${extractPlainText(block.heading_1?.rich_text)}`);
        lines.push('');
        break;
      case 'heading_2':
        lines.push(`## ${extractPlainText(block.heading_2?.rich_text)}`);
        lines.push('');
        break;
      case 'heading_3':
        lines.push(`### ${extractPlainText(block.heading_3?.rich_text)}`);
        lines.push('');
        break;
      case 'bulleted_list_item':
        lines.push(`- ${extractPlainText(block.bulleted_list_item?.rich_text)}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${extractPlainText(block.numbered_list_item?.rich_text)}`);
        break;
      case 'to_do': {
        const checked = block.to_do?.checked ? 'x' : ' ';
        lines.push(`- [${checked}] ${extractPlainText(block.to_do?.rich_text)}`);
        break;
      }
      case 'code':
        lines.push(`\`\`\`${block.code?.language ?? ''}`);
        lines.push(extractPlainText(block.code?.rich_text));
        lines.push('```');
        lines.push('');
        break;
      case 'quote':
        lines.push(`> ${extractPlainText(block.quote?.rich_text)}`);
        lines.push('');
        break;
      case 'divider':
        lines.push('---');
        lines.push('');
        break;
      case 'image': {
        const url = block.image?.file?.url ?? block.image?.external?.url ?? '';
        if (url) lines.push(`![image](${url})`);
        lines.push('');
        break;
      }
      default:
        break;
    }
  }

  return lines.join('\n').trim();
}

async function fetchPageBlocks(pageId: string, token: string): Promise<NotionBlock[]> {
  const res = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { results: NotionBlock[] };
  return data.results ?? [];
}

function getTitleFromProperties(properties: Record<string, NotionProperty>): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === 'title') {
      return extractPlainText(prop.title);
    }
  }
  return 'Untitled';
}

function getStatusFromProperties(properties: Record<string, NotionProperty>): string | undefined {
  for (const [key, prop] of Object.entries(properties)) {
    const keyLower = key.toLowerCase();
    if (prop.type === 'status' && prop.status?.name) return prop.status.name;
    if (prop.type === 'select' && keyLower === 'status' && prop.select?.name) return prop.select.name;
  }
  return undefined;
}

function getTagsFromProperties(properties: Record<string, NotionProperty>): string[] {
  for (const [key, prop] of Object.entries(properties)) {
    const keyLower = key.toLowerCase();
    if (prop.type === 'multi_select' && (keyLower === 'tags' || keyLower === 'tag' || keyLower === 'categories')) {
      return (prop.multi_select ?? []).map((s) => s.name);
    }
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      databaseId?: string;
      notionToken?: string;
      preview?: boolean;
    };

    const databaseId = body.databaseId;
    const token = body.notionToken || process.env.NOTION_ACCESS_TOKEN;

    if (!databaseId) {
      return NextResponse.json({ error: 'databaseId is required' }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ error: 'Notion token is required. Connect Notion or provide notionToken.' }, { status: 400 });
    }

    // Query the Notion database
    const pageSize = body.preview ? 5 : 100;
    const queryRes = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: pageSize }),
    });

    if (!queryRes.ok) {
      const errText = await queryRes.text();
      console.error('Notion query failed:', errText);
      return NextResponse.json(
        { error: `Notion API error: ${queryRes.status}` },
        { status: queryRes.status },
      );
    }

    const queryData = (await queryRes.json()) as { results: NotionPage[] };
    const pages = queryData.results ?? [];

    // Map pages to content items
    const items = await Promise.all(
      pages.map(async (page, index) => {
        const title = getTitleFromProperties(page.properties);
        const statusRaw = getStatusFromProperties(page.properties);
        const status = mapNotionStatus(statusRaw);
        const tags = getTagsFromProperties(page.properties);

        // Fetch page content blocks and convert to markdown
        const blocks = await fetchPageBlocks(page.id, token);
        const bodyMarkdown = blocksToMarkdown(blocks);

        const wordCount = bodyMarkdown.split(/\s+/).filter(Boolean).length;

        return {
          id: Date.now() + index,
          title,
          body: bodyMarkdown,
          content: bodyMarkdown,
          status,
          tags,
          keyword: '',
          wordCount,
          aiScore: 0,
          seoScore: 0,
          created: new Date(page.created_time).getTime(),
          updated: Date.now(),
          _importSource: 'notion',
          _notionPageId: page.id,
        };
      }),
    );

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error('Notion import error:', err);
    return NextResponse.json({ error: 'Failed to import from Notion' }, { status: 500 });
  }
}
