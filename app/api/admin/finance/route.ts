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
    const [
      workspacesRes,
      profilesRes,
    ] = await Promise.all([
      // All workspaces with plan, AI calls, stripe info, created_at
      supabase
        .from('workspaces')
        .select('id, name, owner_id, plan, credits_ai_calls, credits_ai_limit, stripe_customer_id, stripe_subscription_id, created_at'),
      // All profiles for owner email lookup
      supabase
        .from('profiles')
        .select('id, email, full_name, created_at'),
    ]);

    const workspaces = workspacesRes.data || [];
    const profiles = profilesRes.data || [];

    // Plan counts
    const planCounts: Record<string, number> = { free: 0, pro: 0, business: 0, byok: 0 };
    workspaces.forEach((w: { plan: string }) => {
      const p = (w.plan || 'free').toLowerCase();
      if (p in planCounts) planCounts[p]++;
      else planCounts.free++;
    });

    // Total AI calls
    const totalAiCalls = workspaces.reduce(
      (sum: number, w: { credits_ai_calls: number | null }) => sum + (w.credits_ai_calls || 0),
      0
    );

    // BYOK AI calls (workspaces where plan is byok)
    const byokAiCalls = workspaces
      .filter((w: { plan: string }) => (w.plan || '').toLowerCase() === 'byok')
      .reduce(
        (sum: number, w: { credits_ai_calls: number | null }) => sum + (w.credits_ai_calls || 0),
        0
      );

    // Paying customers (pro + business with stripe info)
    const payingCustomers = workspaces
      .filter((w: { plan: string; stripe_customer_id: string | null }) =>
        ['pro', 'business'].includes((w.plan || '').toLowerCase())
      )
      .map((w: {
        id: string;
        name: string;
        owner_id: string;
        plan: string;
        credits_ai_calls: number | null;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        created_at: string;
      }) => {
        const owner = profiles.find((p: { id: string }) => p.id === w.owner_id);
        return {
          workspace_id: w.id,
          workspace_name: w.name,
          owner_email: owner?.email || 'unknown',
          owner_name: owner?.full_name || 'unknown',
          plan: w.plan,
          credits_ai_calls: w.credits_ai_calls || 0,
          stripe_customer_id: w.stripe_customer_id,
          stripe_subscription_id: w.stripe_subscription_id,
          created_at: w.created_at,
        };
      });

    // Monthly signup counts (GROUP BY month from workspace created_at)
    const monthlySignups: Record<string, number> = {};
    workspaces.forEach((w: { created_at: string }) => {
      if (w.created_at) {
        const month = w.created_at.substring(0, 7); // YYYY-MM
        monthlySignups[month] = (monthlySignups[month] || 0) + 1;
      }
    });

    // Monthly plan breakdown for revenue trend
    const monthlyPlanBreakdown: Record<string, Record<string, number>> = {};
    workspaces.forEach((w: { created_at: string; plan: string }) => {
      if (w.created_at) {
        const month = w.created_at.substring(0, 7);
        if (!monthlyPlanBreakdown[month]) monthlyPlanBreakdown[month] = { free: 0, pro: 0, business: 0, byok: 0 };
        const p = (w.plan || 'free').toLowerCase();
        if (p in monthlyPlanBreakdown[month]) monthlyPlanBreakdown[month][p]++;
        else monthlyPlanBreakdown[month].free++;
      }
    });

    return Response.json({
      planCounts,
      totalAiCalls,
      byokAiCalls,
      platformAiCalls: totalAiCalls - byokAiCalls,
      payingCustomers,
      monthlySignups,
      monthlyPlanBreakdown,
      totalWorkspaces: workspaces.length,
      totalUsers: profiles.length,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fetch finance data', details: String(err) },
      { status: 500 }
    );
  }
}
