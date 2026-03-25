const { Resend } = require('resend');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const FROM = process.env.RESEND_FROM || 'noreply@getconduit.io';

// Shared email wrapper
const emailShell = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030508;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px">
    <div style="background:#080C14;border:1px solid #1E2A3E;border-radius:12px;padding:36px;color:#F0F4FF">
      ${content}
      <hr style="border:none;border-top:1px solid #1E2A3E;margin:28px 0 16px">
      <p style="color:#4A5A7A;font-size:11px;margin:0;text-align:center">Conduit CMS \u2014 AI-native content management</p>
    </div>
  </div>
</body>
</html>`;

const ctaButton = (text, href) =>
  `<a href="${href}" style="display:inline-block;margin-top:20px;padding:13px 30px;background:#6C63FF;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${text}</a>`;

// Template: Welcome
function welcomeEmail(to, workspaceName) {
  return {
    to,
    subject: 'Your Conduit workspace is ready',
    html: emailShell(`
      <h1 style="color:#6C63FF;margin:0 0 8px;font-size:24px">Welcome to Conduit \u2726</h1>
      <p style="color:#8B9EC4;line-height:1.6;margin:16px 0">Your workspace <strong style="color:#F0F4FF">${workspaceName}</strong> is ready.</p>
      <p style="color:#8B9EC4;line-height:1.6;margin:0">You have <strong style="color:#00D084">10 free AI calls</strong> to get started.</p>
      ${ctaButton('Open My Workspace', 'https://getconduit.io/app.html')}
      <div style="margin-top:28px;padding:16px;background:#0E1420;border-radius:8px">
        <p style="color:#F0F4FF;font-size:13px;font-weight:600;margin:0 0 10px">\u{1F680} First steps:</p>
        <ol style="color:#8B9EC4;font-size:13px;line-height:1.8;margin:0;padding-left:18px">
          <li>Create an article with AI</li>
          <li>Try Bulk Generate for 10 articles at once</li>
          <li>Check the SEO Center for optimization tips</li>
        </ol>
      </div>
    `),
  };
}

// Template: Usage warning
function usageWarningEmail(to, used, limit) {
  const pct = Math.round((used / limit) * 100);
  return {
    to,
    subject: '2 free AI calls remaining on Conduit',
    html: emailShell(`
      <h1 style="color:#FF9F43;margin:0 0 8px;font-size:22px">You're almost out of free AI calls</h1>
      <p style="color:#8B9EC4;line-height:1.6;margin:16px 0">${used} of ${limit} calls used</p>
      <div style="background:#0E1420;border-radius:6px;height:8px;overflow:hidden;margin:12px 0">
        <div style="background:#FF9F43;height:100%;width:${pct}%;border-radius:6px"></div>
      </div>
      <div style="margin-top:24px;padding:16px;background:#0E1420;border-radius:8px">
        <p style="color:#F0F4FF;font-size:13px;margin:0 0 12px"><strong>Two ways to keep going:</strong></p>
        <p style="color:#8B9EC4;font-size:13px;line-height:1.6;margin:0 0 6px"><strong style="color:#00D084">Option A:</strong> Add your own Claude API key in AI Engine \u2014 free forever</p>
        <p style="color:#8B9EC4;font-size:13px;line-height:1.6;margin:0"><strong style="color:#6C63FF">Option B:</strong> Upgrade to Pro \u2014 1,000 calls/month</p>
      </div>
      ${ctaButton('Upgrade Now', 'https://getconduit.io/app.html#settings')}
    `),
  };
}

// Template: Upgrade confirmation
function upgradeConfirmEmail(to, plan, amount) {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const credits = plan === 'business' ? '10,000' : '1,000';
  return {
    to,
    subject: `You're on Conduit ${planName} \u{1F389}`,
    html: emailShell(`
      <h1 style="color:#6C63FF;margin:0 0 8px;font-size:24px">Conduit ${planName} \u2728</h1>
      <p style="color:#8B9EC4;line-height:1.6;margin:16px 0">Your upgrade to <strong style="color:#F0F4FF">${planName}</strong> is confirmed${amount ? ` \u2014 $${(amount / 100).toFixed(2)}/mo` : ''}.</p>
      <p style="color:#8B9EC4;line-height:1.6;margin:0">What's now unlocked:</p>
      <ul style="color:#8B9EC4;line-height:1.8;padding-left:20px;margin:12px 0">
        <li><strong style="color:#00D084">${credits}</strong> AI calls per month</li>
        <li>All premium features</li>
        <li>Priority support</li>
      </ul>
      ${ctaButton('Open Conduit', 'https://getconduit.io/app.html')}
    `),
  };
}

const TEMPLATES = {
  welcome: welcomeEmail,
  usageWarning: usageWarningEmail,
  upgradeConfirm: upgradeConfirmEmail,
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, template, data } = req.body;

    if (!to || !template) {
      return res.status(400).json({ error: 'Missing required fields: to, template' });
    }

    const templateFn = TEMPLATES[template];
    if (!templateFn) {
      return res.status(400).json({ error: `Unknown template: ${template}` });
    }

    // Build email from template
    const args = [to, ...(Array.isArray(data) ? data : [data])];
    const email = templateFn(...args);

    // Send via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: result, error } = await resend.emails.send({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    return res.status(200).json({ success: true, id: result?.id });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

// Export template functions for use by other API routes
module.exports.welcomeEmail = welcomeEmail;
module.exports.usageWarningEmail = usageWarningEmail;
module.exports.upgradeConfirmEmail = upgradeConfirmEmail;
