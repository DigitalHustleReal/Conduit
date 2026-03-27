import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?gsc=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?gsc=error&reason=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  const redirectUri = `${appUrl}/api/gsc/callback`;

  // Exchange authorization code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('GSC token exchange failed:', errBody);
    return NextResponse.redirect(`${appUrl}/integrations?gsc=error&reason=token_exchange_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  };

  if (!tokens.refresh_token) {
    console.error('GSC token exchange did not return a refresh_token');
    return NextResponse.redirect(`${appUrl}/integrations?gsc=error&reason=no_refresh_token`);
  }

  // In a full implementation this would persist to Supabase workspace settings.
  // For now we pass the refresh token back as a query param so the client can
  // store it in workspace settings via the Zustand store + Supabase sync.
  const successParams = new URLSearchParams({
    gsc: 'success',
    gsc_refresh_token: tokens.refresh_token,
  });

  return NextResponse.redirect(`${appUrl}/integrations?${successParams.toString()}`);
}
