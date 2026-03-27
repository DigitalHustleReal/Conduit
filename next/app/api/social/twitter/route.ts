import { NextRequest } from 'next/server';

// Twitter/X API v2 posting endpoint
// Env vars: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_REFRESH_TOKEN

interface TwitterPostBody {
  text: string;
  mediaIds?: string[];
}

interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const refreshToken = process.env.TWITTER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Twitter OAuth credentials not configured');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Twitter token refresh failed: ${res.status} ${errText}`);
  }

  const data: TwitterTokenResponse = await res.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const body: TwitterPostBody = await request.json();

    if (!body.text || typeof body.text !== 'string') {
      return Response.json({ error: 'text field is required' }, { status: 400 });
    }

    if (body.text.length > 280) {
      return Response.json({ error: 'Tweet exceeds 280 character limit' }, { status: 400 });
    }

    // Use stored access token, or refresh if needed
    let accessToken = process.env.TWITTER_ACCESS_TOKEN;
    if (!accessToken) {
      try {
        accessToken = await refreshAccessToken();
      } catch {
        return Response.json(
          { error: 'Twitter not connected. Please connect your Twitter account in Settings > Integrations.' },
          { status: 401 }
        );
      }
    }

    // Build tweet payload per Twitter API v2
    const tweetPayload: Record<string, unknown> = { text: body.text };
    if (body.mediaIds && body.mediaIds.length > 0) {
      tweetPayload.media = { media_ids: body.mediaIds };
    }

    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(tweetPayload),
    });

    // If 401, try refreshing token once
    if (res.status === 401) {
      try {
        accessToken = await refreshAccessToken();
      } catch {
        return Response.json(
          { error: 'Twitter authentication expired. Please reconnect your account.' },
          { status: 401 }
        );
      }

      const retryRes = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(tweetPayload),
      });

      if (!retryRes.ok) {
        const errText = await retryRes.text().catch(() => retryRes.statusText);
        return Response.json(
          { error: `Twitter API error: ${retryRes.status} ${errText.slice(0, 200)}` },
          { status: retryRes.status }
        );
      }

      const retryData = await retryRes.json();
      const tweetId = retryData.data?.id;
      return Response.json({
        id: tweetId,
        url: `https://twitter.com/i/web/status/${tweetId}`,
      });
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return Response.json(
        { error: `Twitter API error: ${res.status} ${errText.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const tweetId = data.data?.id;

    return Response.json({
      id: tweetId,
      url: `https://twitter.com/i/web/status/${tweetId}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
