import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Conduit',
  description: 'How Conduit collects, uses, and protects your personal data. GDPR-friendly privacy policy.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2026</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conduit (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is operated by DigitalHustle. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at getconduit.io and associated services. We are committed to protecting your privacy and handling your data transparently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold mb-2 mt-4">Account Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account, we collect your name, email address, and authentication credentials. If you sign in via Google OAuth, we receive your name, email, and profile picture from Google.
            </p>
            <h3 className="text-base font-semibold mb-2 mt-4">Usage Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We automatically collect information about how you interact with Conduit, including pages visited, features used, AI agent runs, content created, and performance metrics. This helps us improve the platform.
            </p>
            <h3 className="text-base font-semibold mb-2 mt-4">Content Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              Content you create, edit, and publish through Conduit is stored in your workspace. This includes articles, keywords, media files, pipeline configurations, and automation rules.
            </p>
            <h3 className="text-base font-semibold mb-2 mt-4">Payment Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              Payment processing is handled by Stripe. We do not store credit card numbers or bank account details on our servers. Stripe may collect payment information in accordance with their own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Provide, maintain, and improve the Conduit platform</li>
              <li>Process AI agent requests through our supported providers</li>
              <li>Manage your account and subscription</li>
              <li>Send transactional emails (welcome, usage alerts, billing)</li>
              <li>Monitor platform health and detect abuse</li>
              <li>Respond to support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Conduit integrates with the following third-party services, each with their own privacy policies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li><strong className="text-foreground">Supabase</strong> &mdash; Database, authentication, and file storage</li>
              <li><strong className="text-foreground">Stripe</strong> &mdash; Payment processing (PCI DSS compliant)</li>
              <li><strong className="text-foreground">Anthropic (Claude)</strong> &mdash; AI content generation</li>
              <li><strong className="text-foreground">OpenAI (GPT-4)</strong> &mdash; AI content generation</li>
              <li><strong className="text-foreground">Google (Gemini)</strong> &mdash; AI content generation, Google Search Console</li>
              <li><strong className="text-foreground">Mistral &amp; Groq</strong> &mdash; AI content generation</li>
              <li><strong className="text-foreground">Resend</strong> &mdash; Transactional email delivery</li>
              <li><strong className="text-foreground">Vercel</strong> &mdash; Hosting and serverless functions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conduit uses essential cookies for authentication and session management. We use localStorage to persist your workspace data and preferences (theme, layout settings). We do not use advertising or tracking cookies. Analytics events are collected server-side without third-party trackers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. Content data is retained in your workspace until you delete it. If you delete your account, we will remove your personal data within 30 days, except where we are required to retain it for legal or compliance purposes. Aggregated, anonymized data may be retained indefinitely for analytics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under GDPR and applicable data protection laws, you have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li><strong className="text-foreground">Access</strong> &mdash; Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Rectification</strong> &mdash; Correct inaccurate or incomplete data</li>
              <li><strong className="text-foreground">Erasure</strong> &mdash; Request deletion of your personal data</li>
              <li><strong className="text-foreground">Portability</strong> &mdash; Export your data in a machine-readable format</li>
              <li><strong className="text-foreground">Restriction</strong> &mdash; Limit how we process your data</li>
              <li><strong className="text-foreground">Objection</strong> &mdash; Object to processing based on legitimate interests</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at privacy@getconduit.io.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data, including encryption in transit (TLS 1.3), encryption at rest, row-level security policies on our database, and regular security reviews. See our <Link href="/security" className="text-primary hover:underline">Security page</Link> for more details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conduit is not intended for users under the age of 16. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date. Continued use of Conduit after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <ul className="list-none text-muted-foreground space-y-1 mt-3 leading-relaxed">
              <li>Email: privacy@getconduit.io</li>
              <li>General: hello@getconduit.io</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
