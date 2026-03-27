import { NextResponse } from 'next/server';

const NOTION_OAUTH_URL = 'https://api.notion.com/v1/oauth/authorize';

export async function GET() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: 'Notion OAuth is not configured. Set NOTION_CLIENT_ID and NEXT_PUBLIC_APP_URL.' },
      { status: 500 },
    );
  }

  const redirectUri = `${appUrl}/api/import/notion/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user',
  });

  return NextResponse.redirect(`${NOTION_OAUTH_URL}?${params.toString()}`);
}
