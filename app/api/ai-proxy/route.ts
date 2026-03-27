import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  pro: 1000,
  business: 10000,
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // 1. Verify JWT
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return Response.json({ error: 'Missing authorization token' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401, headers: corsHeaders });
    }

    // 2. Load workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, plan, credits_ai_calls, settings')
      .eq('owner_id', user.id)
      .single();

    if (wsError || !workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404, headers: corsHeaders });
    }

    // 3. Determine API key and check quota
    const userApiKey = workspace.settings?.apiKey;
    let apiKey = process.env.ANTHROPIC_API_KEY!;

    if (userApiKey) {
      // User has their own key -- use it, skip quota
      apiKey = userApiKey;
    } else {
      // Check platform quota
      const limit = PLAN_LIMITS[workspace.plan] || PLAN_LIMITS.free;
      const used = workspace.credits_ai_calls || 0;

      if (used >= limit) {
        return Response.json(
          {
            error: 'Free trial complete. Add your API key in AI Engine or upgrade to Pro.',
            used,
            limit,
          },
          { status: 402, headers: corsHeaders }
        );
      }
    }

    // 4. Forward request to Anthropic
    const body = await request.json();
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

    // 5. Increment usage (async, non-blocking) -- only if using platform key
    if (!userApiKey) {
      const newCount = (workspace.credits_ai_calls || 0) + 1;
      supabase
        .from('workspaces')
        .update({ credits_ai_calls: newCount })
        .eq('id', workspace.id)
        .then(() => undefined);

      // Send usage warning email at 8 of 10 free calls
      const limit = PLAN_LIMITS[workspace.plan] || PLAN_LIMITS.free;
      if (newCount === limit - 2 && user.email) {
        const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : '';
        fetch(baseUrl + '/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: user.email, template: 'usageWarning', data: [newCount, limit] }),
        }).catch(() => {});
      }
    }

    return Response.json(data, { status: anthropicRes.status, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('ai-proxy error:', err);
    return Response.json({ error: 'Internal server error', message }, { status: 500, headers: corsHeaders });
  }
}
