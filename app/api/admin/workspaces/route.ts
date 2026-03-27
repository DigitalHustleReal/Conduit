import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'conduit-admin-2026';

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return unauthorized();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const planFilter = request.nextUrl.searchParams.get('plan') || '';

    // Get all workspaces
    let query = supabase
      .from('workspaces')
      .select('id, name, owner_id, plan, credits_ai_calls, credits_ai_limit, stripe_customer_id, stripe_subscription_id, domain, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (planFilter && ['free', 'pro', 'business'].includes(planFilter)) {
      query = query.eq('plan', planFilter);
    }

    const { data: workspaces, error: workspacesError } = await query.limit(200);
    if (workspacesError) throw workspacesError;

    // Get owner profiles
    const ownerIds = [...new Set((workspaces || []).map(w => w.owner_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', ownerIds.length ? ownerIds : ['00000000-0000-0000-0000-000000000000']);

    // Get content counts per workspace
    const { data: contentAll } = await supabase
      .from('content')
      .select('workspace_id');

    const contentCounts: Record<string, number> = {};
    (contentAll || []).forEach((c: { workspace_id: string }) => {
      contentCounts[c.workspace_id] = (contentCounts[c.workspace_id] || 0) + 1;
    });

    // Build workspace list with owner info
    const result = (workspaces || []).map(ws => {
      const owner = (profiles || []).find(p => p.id === ws.owner_id);
      return {
        ...ws,
        owner: owner ? { email: owner.email, full_name: owner.full_name } : null,
        contentCount: contentCounts[ws.id] || 0,
      };
    });

    return Response.json({ workspaces: result });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch workspaces', details: String(err) },
      { status: 500 }
    );
  }
}
