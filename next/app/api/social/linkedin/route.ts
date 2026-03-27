import { NextRequest } from 'next/server';

// LinkedIn Marketing API posting endpoint
// Env vars: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN

interface LinkedInPostBody {
  text: string;
  articleUrl?: string;
  imageUrl?: string;
}

async function getLinkedInUserId(accessToken: string): Promise<string> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to get LinkedIn user info: ${res.status}`);
  }

  const data = await res.json();
  return data.sub;
}

export async function POST(request: NextRequest) {
  try {
    const body: LinkedInPostBody = await request.json();

    if (!body.text || typeof body.text !== 'string') {
      return Response.json({ error: 'text field is required' }, { status: 400 });
    }

    if (body.text.length > 3000) {
      return Response.json({ error: 'LinkedIn post exceeds 3000 character limit' }, { status: 400 });
    }

    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) {
      return Response.json(
        { error: 'LinkedIn not connected. Please connect your LinkedIn account in Settings > Integrations.' },
        { status: 401 }
      );
    }

    // Get the authenticated user's LinkedIn ID
    let authorId: string;
    try {
      authorId = await getLinkedInUserId(accessToken);
    } catch {
      return Response.json(
        { error: 'LinkedIn authentication expired. Please reconnect your account.' },
        { status: 401 }
      );
    }

    // Build UGC post payload
    const mediaContent: Record<string, unknown>[] = [];

    if (body.articleUrl) {
      mediaContent.push({
        status: 'READY',
        originalUrl: body.articleUrl,
      });
    }

    if (body.imageUrl) {
      mediaContent.push({
        status: 'READY',
        originalUrl: body.imageUrl,
      });
    }

    const shareMediaCategory = body.articleUrl ? 'ARTICLE' : body.imageUrl ? 'IMAGE' : 'NONE';

    const ugcPost: Record<string, unknown> = {
      author: `urn:li:person:${authorId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: body.text },
          shareMediaCategory,
          ...(mediaContent.length > 0 && {
            media: mediaContent.map((m) => ({
              status: m.status,
              originalUrl: m.originalUrl,
              ...(body.articleUrl && {
                title: { text: body.text.slice(0, 100) },
              }),
            })),
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPost),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return Response.json(
        { error: `LinkedIn API error: ${res.status} ${errText.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const postId = data.id;

    // LinkedIn post URN format: urn:li:share:123456
    // Extract numeric ID for URL
    const numericId = postId?.replace('urn:li:share:', '') || postId;

    return Response.json({
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId || `urn:li:share:${numericId}`}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
