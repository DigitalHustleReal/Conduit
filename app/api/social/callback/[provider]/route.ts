import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// OAuth callback handler — exchanges authorization code for tokens
// and stores credentials in the workspace settings via Supabase

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function getCookie(request: NextRequest, name: string): string | undefined {
  return request.cookies.get(name)?.value;
}

async function exchangeTwitterCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Twitter token exchange failed: ${res.status} ${errText}`);
  }

  return res.json();
}

async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`LinkedIn token exchange failed: ${res.status} ${errText}`);
  }

  return res.json();
}

async function storeTokensInWorkspace(
  workspaceId: string,
  tokenData: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient();

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single();

  const currentSettings = (workspace?.settings as Record<string, unknown>) || {};
  await supabase
    .from('workspaces')
    .update({
      settings: { ...currentSettings, ...tokenData },
    })
    .eq('id', workspaceId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/social/callback/${provider}`;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    const errorDesc = url.searchParams.get('error_description') || error;
    return Response.redirect(
      `${baseUrl}/integrations?social_error=${encodeURIComponent(errorDesc)}`
    );
  }

  if (!code) {
    return Response.redirect(
      `${baseUrl}/integrations?social_error=${encodeURIComponent('No authorization code received')}`
    );
  }

  // Get workspace ID from cookie (set during auth initiation)
  const workspaceId = getCookie(request, 'conduit_workspace_id');

  try {
    if (provider === 'twitter') {
      // Verify CSRF state
      const storedState = getCookie(request, 'twitter_oauth_state');
      if (!state || state !== storedState) {
        return Response.redirect(
          `${baseUrl}/integrations?social_error=${encodeURIComponent('Invalid OAuth state')}`
        );
      }

      const codeVerifier = getCookie(request, 'twitter_code_verifier');
      if (!codeVerifier) {
        return Response.redirect(
          `${baseUrl}/integrations?social_error=${encodeURIComponent('Missing code verifier — please try again')}`
        );
      }

      const tokens = await exchangeTwitterCode(code, codeVerifier, redirectUri);

      // Persist tokens to workspace settings if workspace ID available
      if (workspaceId) {
        await storeTokensInWorkspace(workspaceId, {
          twitter_access_token: tokens.access_token,
          twitter_refresh_token: tokens.refresh_token,
          twitter_token_expires: Date.now() + tokens.expires_in * 1000,
          twitter_connected: true,
        });
      }

      // Clear OAuth cookies and redirect to integrations
      const response = Response.redirect(`${baseUrl}/integrations?social_connected=twitter`);
      response.headers.append('Set-Cookie', 'twitter_oauth_state=; Path=/; HttpOnly; Max-Age=0');
      response.headers.append('Set-Cookie', 'twitter_code_verifier=; Path=/; HttpOnly; Max-Age=0');
      return response;
    }

    if (provider === 'linkedin') {
      const storedState = getCookie(request, 'linkedin_oauth_state');
      if (!state || state !== storedState) {
        return Response.redirect(
          `${baseUrl}/integrations?social_error=${encodeURIComponent('Invalid OAuth state')}`
        );
      }

      const tokens = await exchangeLinkedInCode(code, redirectUri);

      if (workspaceId) {
        await storeTokensInWorkspace(workspaceId, {
          linkedin_access_token: tokens.access_token,
          linkedin_token_expires: Date.now() + tokens.expires_in * 1000,
          linkedin_connected: true,
        });
      }

      const response = Response.redirect(`${baseUrl}/integrations?social_connected=linkedin`);
      response.headers.append('Set-Cookie', 'linkedin_oauth_state=; Path=/; HttpOnly; Max-Age=0');
      return response;
    }

    return Response.redirect(
      `${baseUrl}/integrations?social_error=${encodeURIComponent(`Unsupported provider: ${provider}`)}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during OAuth';
    return Response.redirect(
      `${baseUrl}/integrations?social_error=${encodeURIComponent(message)}`
    );
  }
}
