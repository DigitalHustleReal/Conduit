import type { ContentItem } from '@/types/content';
import type { WorkspaceSettings } from '@/types/workspace';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SocialPlatform = 'twitter' | 'linkedin';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  text: string;
  articleUrl?: string;
  imageUrl?: string;
  mediaIds?: string[];
  contentId?: number;
  status: 'queued' | 'posted' | 'failed';
  scheduledAt?: number;
  postedAt?: number;
  error?: string;
  externalId?: string;
  externalUrl?: string;
  created: number;
}

export interface SocialAccount {
  platform: SocialPlatform;
  connected: boolean;
  label: string;
  icon: string;
}

export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  twitter: 280,
  linkedin: 3000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from content body to get plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract relevant hashtags from content tags or keywords.
 */
function extractHashtags(item: ContentItem, max: number = 3): string[] {
  const tags: string[] = [];
  if (item.tags) {
    for (const tag of item.tags.slice(0, max)) {
      const clean = tag.replace(/[^a-zA-Z0-9]/g, '');
      if (clean) tags.push(`#${clean}`);
    }
  }
  if (tags.length === 0 && item.keyword) {
    const clean = item.keyword.replace(/[^a-zA-Z0-9]/g, '');
    if (clean) tags.push(`#${clean}`);
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Generate platform-optimised social posts from a content item
// ---------------------------------------------------------------------------

export function generateSocialPosts(
  content: ContentItem,
  siteUrl?: string
): Record<SocialPlatform, string> {
  const plainText = stripHtml(content.body || content.content || content.excerpt || '');
  const title = content.title || 'New article';
  const articleUrl = siteUrl && content.slug
    ? `${siteUrl.replace(/\/$/, '')}/${content.slug}`
    : '';

  // --- Twitter: 280 chars, punchy, hashtags, link --------------------------
  const hashtags = extractHashtags(content, 3);
  const hashtagStr = hashtags.join(' ');
  const linkLen = articleUrl ? articleUrl.length + 1 : 0; // +1 for space
  const hashtagLen = hashtagStr ? hashtagStr.length + 1 : 0;
  const maxTitleLen = 280 - linkLen - hashtagLen - 4; // 4 for "\n\n" and space padding

  let twitterText = title.length > maxTitleLen ? title.slice(0, maxTitleLen - 1) + '\u2026' : title;
  if (hashtagStr) twitterText += '\n\n' + hashtagStr;
  if (articleUrl) twitterText += '\n' + articleUrl;

  // --- LinkedIn: professional, longer, article URL -------------------------
  const summary = plainText.length > 400
    ? plainText.slice(0, 397) + '...'
    : plainText || title;

  let linkedinText = `${title}\n\n${summary}`;
  if (articleUrl) linkedinText += `\n\nRead more: ${articleUrl}`;
  if (hashtags.length > 0) linkedinText += '\n\n' + hashtags.join(' ');
  if (linkedinText.length > 3000) {
    linkedinText = linkedinText.slice(0, 2997) + '...';
  }

  return { twitter: twitterText, linkedin: linkedinText };
}

// ---------------------------------------------------------------------------
// Schedule a social post (adds to local queue)
// ---------------------------------------------------------------------------

export function schedulePost(
  platform: SocialPlatform,
  text: string,
  scheduledAt?: number,
  contentId?: number,
  articleUrl?: string
): SocialPost {
  return {
    id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    platform,
    text,
    articleUrl,
    contentId,
    status: 'queued',
    scheduledAt: scheduledAt || undefined,
    created: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Check which social accounts are connected
// ---------------------------------------------------------------------------

export function getConnectedAccounts(settings: WorkspaceSettings): SocialAccount[] {
  const integrations = settings.integrations as Record<string, unknown>;

  return [
    {
      platform: 'twitter' as SocialPlatform,
      connected: !!(
        integrations?.twitter_connected ||
        (integrations?.twitter && typeof integrations.twitter === 'object' && (integrations.twitter as Record<string, unknown>).connected)
      ),
      label: 'Twitter / X',
      icon: 'X',
    },
    {
      platform: 'linkedin' as SocialPlatform,
      connected: !!(
        integrations?.linkedin_connected ||
        (integrations?.linkedin && typeof integrations.linkedin === 'object' && (integrations.linkedin as Record<string, unknown>).connected)
      ),
      label: 'LinkedIn',
      icon: 'in',
    },
  ];
}

// ---------------------------------------------------------------------------
// Post to a social platform via our API routes
// ---------------------------------------------------------------------------

export async function postToSocial(
  post: SocialPost
): Promise<{ id: string; url: string }> {
  const endpoint = `/api/social/${post.platform}`;

  const body: Record<string, unknown> = { text: post.text };
  if (post.platform === 'twitter' && post.mediaIds) {
    body.mediaIds = post.mediaIds;
  }
  if (post.platform === 'linkedin') {
    if (post.articleUrl) body.articleUrl = post.articleUrl;
    if (post.imageUrl) body.imageUrl = post.imageUrl;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Failed to post to ${post.platform}`);
  }

  return { id: data.id, url: data.url };
}
