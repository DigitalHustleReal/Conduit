import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // Verify JWT
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

    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, plan')
      .eq('owner_id', user.id)
      .single();

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404, headers: corsHeaders });
    }

    const body = await request.json();
    const { plan } = body;
    const priceId = plan === 'business'
      ? process.env.STRIPE_BUSINESS_PRICE_ID
      : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return Response.json({ error: 'Price ID not configured for plan: ' + plan }, { status: 400, headers: corsHeaders });
    }

    // Create Stripe Checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email!,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        workspace_id: workspace.id,
        plan: plan || 'pro',
        user_id: user.id,
      },
      success_url: (process.env.SITE_URL || 'https://conduit-woad.vercel.app') + '/app.html?upgraded=' + (plan || 'pro'),
      cancel_url: (process.env.SITE_URL || 'https://conduit-woad.vercel.app') + '/app.html#settings',
    });

    return Response.json({ url: session.url, sessionId: session.id }, { status: 200, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-checkout error:', err);
    return Response.json({ error: 'Internal server error', message }, { status: 500, headers: corsHeaders });
  }
}
