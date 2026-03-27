import { NextRequest } from 'next/server';

// OAuth flow initiation for social media providers
// Redirects user to the provider's OAuth consent screen

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const baseUrl = getBaseUrl(request);
  const callbackUrl = `${baseUrl}/api/social/callback/${provider}`;

  // Store state for CSRF protection
  const state = crypto.randomUUID();

  if (provider === 'twitter') {
    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) {
      return Response.json(
        { error: 'TWITTER_CLIENT_ID not configured' },
        { status: 500 }
      );
    }

    // Twitter OAuth 2.0 with PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = new URL(TWITTER_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Store verifier and state in a cookie for the callback to use
    const response = new Response(null, {
      status: 302,
      headers: { Location: authUrl.toString() },
    });
    response.headers.append(
      'Set-Cookie',
      `twitter_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    response.headers.append(
      'Set-Cookie',
      `twitter_code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    return response;
  }

  if (provider === 'linkedin') {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return Response.json(
        { error: 'LINKEDIN_CLIENT_ID not configured' },
        { status: 500 }
      );
    }

    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', 'openid profile w_member_social');
    authUrl.searchParams.set('state', state);

    const response = new Response(null, {
      status: 302,
      headers: { Location: authUrl.toString() },
    });
    response.headers.append(
      'Set-Cookie',
      `linkedin_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    return response;
  }

  return Response.json(
    { error: `Unsupported provider: ${provider}. Supported: twitter, linkedin` },
    { status: 400 }
  );
}
