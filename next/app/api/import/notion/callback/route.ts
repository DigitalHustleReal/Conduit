import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/integrations?notion=error&reason=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?notion=error&reason=no_code`);
  }

  const clientId = process.env.NOTION_CLIENT_ID ?? '';
  const clientSecret = process.env.NOTION_CLIENT_SECRET ?? '';
  const redirectUri = `${appUrl}/api/import/notion/callback`;

  // Exchange authorization code for access token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('Notion token exchange failed:', errBody);
    return NextResponse.redirect(`${appUrl}/integrations?notion=error&reason=token_exchange_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    workspace_id: string;
    workspace_name: string;
    bot_id: string;
  };

  // Pass token back to client so the workspace store can persist it.
  // A production implementation would store this server-side in Supabase.
  const successParams = new URLSearchParams({
    notion: 'success',
    notion_token: tokens.access_token,
    notion_workspace: tokens.workspace_name ?? '',
  });

  return NextResponse.redirect(`${appUrl}/integrations?${successParams.toString()}`);
}
