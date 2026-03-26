const { createClient } = require('@supabase/supabase-js');

/**
 * Webhook Notify — /api/notify
 * POST /api/notify — called internally when content is published/updated
 * Fires registered webhooks + can trigger external rebuilds
 *
 * Body: { event: "content.published", slug: "article-slug", workspace_id: "uuid" }
 * Also: { event: "content.updated", event: "content.deleted" }
 *
 * investingpro.in can register a webhook URL to get notified of new content
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || '*');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { event, slug, workspace_id, data: payload } = req.body || {};
    if (!event) return res.status(400).json({ error: 'Missing event type' });

    // Find webhooks registered for this event
    var query = supabase.from('webhooks').select('*').eq('active', true);
    if (workspace_id) query = query.eq('workspace_id', workspace_id);
    const { data: webhooks } = await query;

    var results = [];
    for (var i = 0; i < (webhooks || []).length; i++) {
      var wh = webhooks[i];
      var events = wh.events || [];
      if (events.indexOf(event) === -1 && events.indexOf('*') === -1) continue;

      try {
        var startTs = Date.now();
        var r = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Conduit-Event': event,
            'X-Conduit-Signature': wh.secret || '',
          },
          body: JSON.stringify({ event, slug, timestamp: new Date().toISOString(), data: payload || {} }),
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
        results.push({ url: wh.url, status: 0, ok: false, error: whErr.message });
      }
    }

    return res.status(200).json({ event, webhooksFired: results.length, results });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: 'Notification failed' });
  }
};
