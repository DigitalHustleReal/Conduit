import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

interface WebhookRow {
  id: string;
  workspace_id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
}

interface WebhookResult {
  url: string;
  status: number;
  ok: boolean;
  duration?: number;
  error?: string;
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const body = await request.json();
    const { event, slug, workspace_id, data: payload } = body || {};

    if (!event) {
      return Response.json({ error: 'Missing event type', code: 'MISSING_EVENT' }, { status: 400, headers: corsHeaders });
    }

    // Fetch content data if slug is provided and no payload given
    let contentData = payload || {};
    if (slug && !payload) {
      let contentQuery = supabase
        .from('content')
        .select('id, title, slug, excerpt, meta_desc, collection, author, tags, seo_score, published_at, created_at, updated_at')
        .eq('slug', slug);
      if (workspace_id) contentQuery = contentQuery.eq('workspace_id', workspace_id);
      const { data: contentRow } = await contentQuery.single();
      if (contentRow) contentData = contentRow;
    }

    // Find webhooks registered for this event
    let query = supabase.from('webhooks').select('*').eq('active', true);
    if (workspace_id) query = query.eq('workspace_id', workspace_id);
    const { data: webhooks } = await query;

    const results: WebhookResult[] = [];
    for (let i = 0; i < (webhooks || []).length; i++) {
      const wh = (webhooks as WebhookRow[])[i];
      const events = wh.events || [];
      if (events.indexOf(event) === -1 && events.indexOf('*') === -1) continue;

      // Build the webhook payload
      const webhookBody = JSON.stringify({
        event,
        slug: slug || null,
        content: contentData,
        timestamp: new Date().toISOString(),
        data: payload || {},
      });

      // Generate HMAC-SHA256 signature using the webhook secret
      let signature = '';
      const signingSecret = wh.secret || process.env.CONDUIT_WEBHOOK_SECRET || '';
      if (signingSecret) {
        signature = createHmac('sha256', signingSecret)
          .update(webhookBody)
          .digest('hex');
      }

      try {
        const startTs = Date.now();
        const r = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Conduit-Event': event,
            'X-Conduit-Signature': signature,
            'X-Conduit-Timestamp': new Date().toISOString(),
            'User-Agent': 'Conduit-Webhook/1.0',
          },
          body: webhookBody,
        });
        const duration = Date.now() - startTs;
        const responseText = await r.text().catch(() => '');

        // Log webhook execution
        await supabase.from('webhook_logs').insert({
          workspace_id: workspace_id || wh.workspace_id,
          webhook_id: wh.id,
          event,
          url: wh.url,
          status_code: r.status,
          response_body: responseText.slice(0, 500),
          success: r.ok,
          duration_ms: duration,
        }).then(() => undefined);

        results.push({ url: wh.url, status: r.status, ok: r.ok, duration });
      } catch (whErr: unknown) {
        const errMessage = whErr instanceof Error ? whErr.message : 'Unknown error';
        // Log failed webhook attempt
        await supabase.from('webhook_logs').insert({
          workspace_id: workspace_id || wh.workspace_id,
          webhook_id: wh.id,
          event,
          url: wh.url,
          status_code: 0,
          response_body: errMessage.slice(0, 500),
          success: false,
          duration_ms: 0,
        }).then(() => undefined);

        results.push({ url: wh.url, status: 0, ok: false, error: errMessage });
      }
    }

    return Response.json(
      {
        event,
        webhooksFired: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Notify error:', err);
    return Response.json({ error: 'Notification failed', code: 'INTERNAL_ERROR' }, { status: 500, headers: corsHeaders });
  }
}
