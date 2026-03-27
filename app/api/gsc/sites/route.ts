import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites';

/** Refresh the access token using a refresh token */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refreshToken = searchParams.get('refreshToken');

    if (!refreshToken) {
      return NextResponse.json({ error: 'Not connected to Google Search Console' }, { status: 401 });
    }

    const accessToken = await refreshAccessToken(refreshToken);

    const res = await fetch(SITES_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('GSC sites API error:', errText);
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: res.status });
    }

    const data = (await res.json()) as {
      siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>;
    };

    return NextResponse.json({
      sites: (data.siteEntry ?? []).map((s) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      })),
    });
  } catch (err) {
    console.error('GSC sites route error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal server error' }, { status: 500 });
  }
}
