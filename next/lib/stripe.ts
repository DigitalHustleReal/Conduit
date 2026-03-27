/**
 * Client-side Stripe helpers for checkout and billing portal.
 */

export async function createCheckoutSession(plan: 'pro' | 'business'): Promise<string> {
  const r = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => r.statusText);
    throw new Error(`Failed to create checkout session: ${errText.slice(0, 200)}`);
  }

  const data = await r.json();
  if (!data.url) {
    throw new Error('No checkout URL returned from server.');
  }
  return data.url;
}

export function redirectToCheckout(sessionUrl: string): void {
  window.location.href = sessionUrl;
}

export async function getPortalUrl(): Promise<string> {
  const r = await fetch('/api/billing-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => r.statusText);
    throw new Error(`Failed to get billing portal URL: ${errText.slice(0, 200)}`);
  }

  const data = await r.json();
  if (!data.url) {
    throw new Error('No portal URL returned from server.');
  }
  return data.url;
}
