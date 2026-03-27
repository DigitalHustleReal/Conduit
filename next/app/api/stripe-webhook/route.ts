import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PLAN_CREDITS: Record<string, number> = {
  pro: 1000,
  business: 10000,
};

async function sendUpgradeEmail(to: string, plan: string, amount?: number) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'noreply@getconduit.io';
    await resend.emails.send({
      from,
      to,
      subject: `You're on Conduit ${plan.charAt(0).toUpperCase() + plan.slice(1)} \u{1F389}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;background:#080C14;color:#F0F4FF;padding:40px;border-radius:12px">
        <h1 style="color:#6C63FF;margin:0 0 16px">Conduit ${plan.charAt(0).toUpperCase() + plan.slice(1)} \u2728</h1>
        <p style="color:#8B9EC4;line-height:1.6">Your upgrade to <strong style="color:#F0F4FF">${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> is confirmed${amount ? ` \u2014 $${(amount / 100).toFixed(2)}/mo` : ''}.</p>
        <p style="color:#8B9EC4;line-height:1.6">You now have access to:</p>
        <ul style="color:#8B9EC4;line-height:1.8;padding-left:20px">
          <li><strong style="color:#00D084">${(PLAN_CREDITS[plan] || 1000).toLocaleString()}</strong> AI calls per month</li>
          <li>All premium features unlocked</li>
          <li>Priority support</li>
        </ul>
        <a href="https://getconduit.io/app.html" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open Conduit</a>
        <p style="color:#4A5A7A;font-size:12px;margin-top:30px">Conduit CMS \u2014 AI-native content management</p>
      </div>`,
    });
  } catch (e) {
    console.error('Failed to send upgrade email:', e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify Stripe signature
    const sig = request.headers.get('stripe-signature');
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', message);
      return Response.json({ error: 'Invalid signature' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const plan = session.metadata?.plan || 'pro';

        if (workspaceId) {
          const credits = PLAN_CREDITS[plan] || PLAN_CREDITS.pro;

          await supabase
            .from('workspaces')
            .update({
              plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              credits_ai_limit: credits,
            })
            .eq('id', workspaceId);

          // Send confirmation email
          if (session.customer_email) {
            await sendUpgradeEmail(session.customer_email, plan, session.amount_total ?? undefined);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, owner_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (workspace) {
          await supabase
            .from('workspaces')
            .update({
              plan: 'free',
              credits_ai_limit: 10,
              stripe_subscription_id: null,
            })
            .eq('id', workspace.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('Payment failed for customer:', invoice.customer);
        // Grace period -- don't downgrade yet
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return Response.json({ received: true }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
