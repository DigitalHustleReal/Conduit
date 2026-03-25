const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// Disable body parsing for Stripe signature verification
module.exports.config = {
  api: { bodyParser: false },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PLAN_CREDITS = {
  pro: 1000,
  business: 10000,
};

async function sendUpgradeEmail(to, plan, amount) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || 'noreply@getconduit.io';
    await resend.emails.send({
      from,
      to,
      subject: `You're on Conduit ${plan.charAt(0).toUpperCase() + plan.slice(1)} \u{1F389}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;background:#080C14;color:#F0F4FF;padding:40px;border-radius:12px">
        <h1 style="color:#6C63FF;margin:0 0 16px">Conduit ${plan.charAt(0).toUpperCase() + plan.slice(1)} \u2728</h1>
        <p style="color:#8B9EC4;line-height:1.6">Your upgrade to <strong style="color:#F0F4FF">${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> is confirmed${amount ? ` — $${(amount / 100).toFixed(2)}/mo` : ''}.</p>
        <p style="color:#8B9EC4;line-height:1.6">You now have access to:</p>
        <ul style="color:#8B9EC4;line-height:1.8;padding-left:20px">
          <li><strong style="color:#00D084">${(PLAN_CREDITS[plan] || 1000).toLocaleString()}</strong> AI calls per month</li>
          <li>All premium features unlocked</li>
          <li>Priority support</li>
        </ul>
        <a href="https://getconduit.io/app.html" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open Conduit</a>
        <p style="color:#4A5A7A;font-size:12px;margin-top:30px">Conduit CMS — AI-native content management</p>
      </div>`,
    });
  } catch (e) {
    console.error('Failed to send upgrade email:', e);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read raw body for signature verification
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString();

    // Verify Stripe signature
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspace_id;
        const plan = session.metadata?.plan || 'pro';

        if (workspaceId) {
          const credits = PLAN_CREDITS[plan] || PLAN_CREDITS.pro;

          await supabase
            .from('workspaces')
            .update({
              plan,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              credits_ai_calls: 0,
              credits_ai_limit: credits,
            })
            .eq('id', workspaceId);

          // Send confirmation email
          if (session.customer_email) {
            await sendUpgradeEmail(session.customer_email, plan, session.amount_total);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
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
        const invoice = event.data.object;
        console.warn('Payment failed for customer:', invoice.customer);
        // Grace period — don't downgrade yet
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
