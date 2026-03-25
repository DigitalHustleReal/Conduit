const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PLAN_LIMITS = {
  free: 10,
  pro: 1000,
  business: 10000,
};

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  // Set CORS headers for all responses
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. Load workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, plan, credits_ai_calls, settings')
      .eq('owner_id', user.id)
      .single();

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // 3. Determine API key and check quota
    const userApiKey = workspace.settings?.apiKey;
    let apiKey = process.env.ANTHROPIC_API_KEY;

    if (userApiKey) {
      // User has their own key — use it, skip quota
      apiKey = userApiKey;
    } else {
      // Check platform quota
      const limit = PLAN_LIMITS[workspace.plan] || PLAN_LIMITS.free;
      const used = workspace.credits_ai_calls || 0;

      if (used >= limit) {
        return res.status(402).json({
          error: 'Free trial complete. Add your API key in AI Engine or upgrade to Pro.',
          used,
          limit,
        });
      }
    }

    // 4. Forward request to Anthropic
    const body = req.body;
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicRes.json();

    // 5. Increment usage (async, non-blocking) — only if using platform key
    if (!userApiKey) {
      const newCount = (workspace.credits_ai_calls || 0) + 1;
      supabase
        .from('workspaces')
        .update({ credits_ai_calls: newCount })
        .eq('id', workspace.id)
        .then(() => {})
        .catch(() => {});

      // Send usage warning email at 8 of 10 free calls
      const limit = PLAN_LIMITS[workspace.plan] || PLAN_LIMITS.free;
      if (newCount === limit - 2 && user.email) {
        fetch((process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : '') + '/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: user.email, template: 'usageWarning', data: [newCount, limit] }),
        }).catch(() => {});
      }
    }

    return res.status(anthropicRes.status).json(data);
  } catch (err) {
    console.error('ai-proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
