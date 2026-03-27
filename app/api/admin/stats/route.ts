import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'conduit-admin-2026';

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return unauthorized();
  }

  const supabase = getSupabase();

  try {
    // Parallel queries for dashboard stats
    const [
      usersRes,
      workspacesRes,
      contentRes,
      aiUsageRes,
      recentSignupsRes,
      recentContentRes,
      tableCountsRes,
      auditLogRes,
      contentByStatusRes,
      workspacesByPlanRes,
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      // Total workspaces
      supabase.from('workspaces').select('id', { count: 'exact', head: true }),
      // Total content
      supabase.from('content').select('id', { count: 'exact', head: true }),
      // Total AI calls (sum credits_ai_calls)
      supabase.from('workspaces').select('credits_ai_calls'),
      // Recent signups (last 10)
      supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(10),
      // Recent content (last 10)
      supabase.from('content').select('id, title, workspace_id, status, seo_score, ai_score, created_at').order('created_at', { ascending: false }).limit(10),
      // Table row counts
      supabase.rpc('admin_table_counts').then(r => r),
      // Recent audit log
      supabase.from('audit_log').select('id, action, entity_type, details, created_at').order('created_at', { ascending: false }).limit(20),
      // Content by status
      supabase.from('content').select('status'),
      // Workspaces by plan
      supabase.from('workspaces').select('plan'),
    ]);

    // Calculate total AI calls
    const totalAiCalls = (aiUsageRes.data || []).reduce(
      (sum: number, w: { credits_ai_calls: number | null }) => sum + (w.credits_ai_calls || 0),
      0
    );

    // Aggregate content by status
    const contentByStatus: Record<string, number> = {};
    (contentByStatusRes.data || []).forEach((c: { status: string }) => {
      contentByStatus[c.status] = (contentByStatus[c.status] || 0) + 1;
    });

    // Aggregate workspaces by plan
    const workspacesByPlan: Record<string, number> = {};
    (workspacesByPlanRes.data || []).forEach((w: { plan: string }) => {
      workspacesByPlan[w.plan] = (workspacesByPlan[w.plan] || 0) + 1;
    });

    // Manual table counts if RPC doesn't exist
    let tableCounts: Record<string, number> = {};
    if (tableCountsRes && 'data' in tableCountsRes && tableCountsRes.data) {
      tableCounts = tableCountsRes.data;
    } else {
      // Fallback: use the counts we already have
      tableCounts = {
        profiles: usersRes.count || 0,
        workspaces: workspacesRes.count || 0,
        content: contentRes.count || 0,
      };
      // Get additional table counts
      const extraTables = ['collections', 'keywords', 'media', 'pipeline', 'audit_log', 'analytics_events', 'webhook_logs', 'webhooks', 'content_versions', 'affiliate_products'] as const;
      const extraCounts = await Promise.all(
        extraTables.map(table =>
          supabase.from(table).select('id', { count: 'exact', head: true })
        )
      );
      extraTables.forEach((table, i) => {
        tableCounts[table] = extraCounts[i].count || 0;
      });
    }

    // Check env vars
    const envVars = [
      'SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRO_PRICE_ID',
      'STRIPE_BUSINESS_PRICE_ID',
      'RESEND_API_KEY',
      'ADMIN_PASSWORD',
    ];
    const envStatus: Record<string, boolean> = {};
    envVars.forEach(v => {
      envStatus[v] = !!process.env[v];
    });

    return Response.json({
      users: usersRes.count || 0,
      workspaces: workspacesRes.count || 0,
      content: contentRes.count || 0,
      aiUsage: totalAiCalls,
      recentSignups: recentSignupsRes.data || [],
      recentContent: recentContentRes.data || [],
      tableCounts,
      auditLog: auditLogRes.data || [],
      contentByStatus,
      workspacesByPlan,
      envStatus,
      supabaseConnected: !usersRes.error,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch stats', details: String(err) },
      { status: 500 }
    );
  }
}
