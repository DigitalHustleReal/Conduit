import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEARCH_ANALYTICS_BASE = 'https://searchconsole.googleapis.com/webmasters/v3/sites';

interface RequestBody {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  refreshToken?: string;
}

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
    const errText = await res.text();
    throw new Error(`Token refresh failed: ${errText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { siteUrl, startDate, endDate, dimensions = ['query'], refreshToken } = body;

    if (!siteUrl || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields: siteUrl, startDate, endDate' }, { status: 400 });
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'Not connected to Google Search Console. Please connect first.' }, { status: 401 });
    }

    const accessToken = await refreshAccessToken(refreshToken);
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const url = `${SEARCH_ANALYTICS_BASE}/${encodedSiteUrl}/searchAnalytics/query`;

    const gscRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit: 100,
      }),
    });

    if (!gscRes.ok) {
      const errText = await gscRes.text();
      console.error('GSC API error:', errText);
      return NextResponse.json({ error: 'Failed to fetch Search Console data' }, { status: gscRes.status });
    }

    const data = await gscRes.json();

    // Transform the GSC response into a friendlier format
    const rows = (data.rows ?? []).map(
      (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => {
        const result: Record<string, unknown> = {
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: Math.round(row.ctr * 10000) / 100, // percentage with 2 decimals
          position: Math.round(row.position * 10) / 10,
        };
        // Map dimension keys to named fields
        dimensions.forEach((dim, i) => {
          result[dim] = row.keys[i];
        });
        return result;
      },
    );

    return NextResponse.json({
      rows,
      responseAggregationType: data.responseAggregationType,
    });
  } catch (err) {
    console.error('GSC data route error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal server error' }, { status: 500 });
  }
}
