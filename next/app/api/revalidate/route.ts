import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * ISR Revalidation Endpoint for investingpro.in
 *
 * POST /api/revalidate
 *
 * Receives webhooks from Conduit when content is published/updated/deleted.
 * Validates the HMAC-SHA256 signature and triggers Next.js ISR revalidation
 * so static pages are regenerated with fresh content.
 *
 * Headers:
 *   X-Conduit-Signature: HMAC-SHA256 hex digest of the request body
 *   X-Conduit-Event: event type (content.published, content.updated, etc.)
 *
 * Body: { event, slug, content, timestamp, data }
 */

const WEBHOOK_SECRET = process.env.CONDUIT_WEBHOOK_SECRET || '';

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    // If no secret configured, skip verification (dev mode)
    console.warn('CONDUIT_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-conduit-signature') || '';

    // Validate HMAC signature
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature', code: 'INVALID_SIGNATURE' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { event, slug, content } = payload;

    if (!event) {
      return NextResponse.json(
        { error: 'Missing event type', code: 'MISSING_EVENT' },
        { status: 400 }
      );
    }

    const revalidated: string[] = [];

    // Revalidate based on event type
    switch (event) {
      case 'content.published':
      case 'content.updated': {
        // Revalidate the specific article page
        if (slug) {
          revalidatePath(`/${slug}`);
          revalidated.push(`/${slug}`);
        }

        // Revalidate listing pages
        revalidatePath('/');
        revalidated.push('/');

        // Revalidate collection page if we know the collection
        if (content?.collection) {
          revalidatePath(`/${content.collection.toLowerCase()}`);
          revalidated.push(`/${content.collection.toLowerCase()}`);
        }

        break;
      }

      case 'content.deleted': {
        if (slug) {
          revalidatePath(`/${slug}`);
          revalidated.push(`/${slug}`);
        }
        revalidatePath('/');
        revalidated.push('/');
        break;
      }

      default: {
        // For unknown events, revalidate the home page and content tag
        revalidatePath('/');
        revalidated.push('/');
        revalidatePath('/', 'layout');
      }
    }

    return NextResponse.json({
      revalidated: true,
      paths: revalidated,
      event: event,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { error: 'Revalidation failed', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// Reject non-POST methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
