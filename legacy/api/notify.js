const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

/**
 * Webhook Notify — /api/notify
 * POST /api/notify — called internally when content is published/updated
 * Fires registered webhooks + can trigger external rebuilds (e.g. investingpro.in ISR)
 *
 * Body: { event: "content.published", slug: "article-slug", workspace_id: "uuid", data: {...} }
 * Also: { event: "content.updated", event: "content.deleted" }
 *
 * Each webhook receives an HMAC-SHA256 signature in the X-Conduit-Signature header
 * so the consumer can verify the payload is authentic.
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { event, slug, workspace_id, data: payload } = req.body || {};

    if (!event) {
      return res.status(400).json({ error: 'Missing event type', code: 'MISSING_EVENT' });
    }

    // Fetch content data if slug is provided and no payload given
    var contentData = payload || {};
    if (slug && !payload) {
      var contentQuery = supabase
        .from('content')
        .select('id, title, slug, excerpt, meta_desc, collection, author, tags, seo_score, published_at, created_at, updated_at')
        .eq('slug', slug);
      if (workspace_id) contentQuery = contentQuery.eq('workspace_id', workspace_id);
      var { data: contentRow } = await contentQuery.single();
      if (contentRow) contentData = contentRow;
    }

    // Find webhooks registered for this event
    var query = supabase.from('webhooks').select('*').eq('active', true);
    if (workspace_id) query = query.eq('workspace_id', workspace_id);
    var { data: webhooks } = await query;

    var results = [];
    for (var i = 0; i < (webhooks || []).length; i++) {
      var wh = webhooks[i];
      var events = wh.events || [];
      if (events.indexOf(event) === -1 && events.indexOf('*') === -1) continue;

      // Build the webhook payload
      var webhookBody = JSON.stringify({
        event: event,
        slug: slug || null,
        content: contentData,
        timestamp: new Date().toISOString(),
        data: payload || {},
      });

      // Generate HMAC-SHA256 signature using the webhook secret
      var signature = '';
      var signingSecret = wh.secret || process.env.CONDUIT_WEBHOOK_SECRET || '';
      if (signingSecret) {
        signature = crypto
          .createHmac('sha256', signingSecret)
          .update(webhookBody)
          .digest('hex');
      }

      try {
        var startTs = Date.now();
        var r = await fetch(wh.url, {
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
        var duration = Date.now() - startTs;
        var responseText = await r.text().catch(function() { return ''; });

        // Log webhook execution
        await supabase.from('webhook_logs').insert({
          workspace_id: workspace_id || wh.workspace_id,
          webhook_id: wh.id,
          event: event,
          url: wh.url,
          status_code: r.status,
          response_body: responseText.slice(0, 500),
          success: r.ok,
          duration_ms: duration,
        }).then(function(){}).catch(function(e){ console.warn('Webhook log failed:', e.message); });

        results.push({ url: wh.url, status: r.status, ok: r.ok, duration: duration });
      } catch (whErr) {
        // Log failed webhook attempt
        await supabase.from('webhook_logs').insert({
          workspace_id: workspace_id || wh.workspace_id,
          webhook_id: wh.id,
          event: event,
          url: wh.url,
          status_code: 0,
          response_body: whErr.message.slice(0, 500),
          success: false,
          duration_ms: 0,
        }).then(function(){}).catch(function(){});

        results.push({ url: wh.url, status: 0, ok: false, error: whErr.message });
      }
    }

    return res.status(200).json({
      event: event,
      webhooksFired: results.length,
      results: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: 'Notification failed', code: 'INTERNAL_ERROR' });
  }
};
