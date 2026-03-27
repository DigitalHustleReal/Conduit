import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security — Conduit',
  description: 'How Conduit protects your data with encryption, row-level security, and industry best practices.',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Security</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: March 2026</p>

        <div className="space-y-10">
          <section>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Security is foundational to Conduit. Your content, API keys, and personal data are protected by multiple layers of defense. Here is how we keep your data safe.
            </p>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: 'Encryption in Transit',
                desc: 'All connections to Conduit use TLS 1.3. API calls, authentication, and data sync are encrypted end-to-end between your browser and our servers.',
                icon: '🔒',
              },
              {
                title: 'Encryption at Rest',
                desc: 'Your data is stored in Supabase (PostgreSQL) with AES-256 encryption at rest. Backups are also encrypted.',
                icon: '🛡️',
              },
              {
                title: 'Row-Level Security',
                desc: 'Every database table uses Supabase RLS policies. Users can only access data within their own workspace. Even if a query is malformed, RLS prevents cross-workspace data leaks.',
                icon: '🔐',
              },
              {
                title: 'Stripe PCI Compliance',
                desc: 'Payment processing is handled entirely by Stripe, a PCI DSS Level 1 certified provider. We never store credit card numbers on our servers.',
                icon: '💳',
              },
              {
                title: 'API Key Encryption',
                desc: 'BYOK (Bring Your Own Key) API keys are encrypted before storage and only decrypted server-side during AI calls. Keys are never exposed to the frontend.',
                icon: '🔑',
              },
              {
                title: 'No Training on Your Data',
                desc: 'Conduit does not use your content to train AI models. When we process your content through AI providers, we use API configurations that disable training data collection where available.',
                icon: '🚫',
              },
            ].map((item) => (
              <div key={item.title} className="border border-border rounded-lg p-5">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Authentication</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conduit supports email/password authentication and Google OAuth, both managed by Supabase Auth. Sessions use JWT tokens with configurable expiration. Password hashing uses bcrypt. We support multi-workspace access with role-based permissions (Admin, Editor, Writer).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Infrastructure</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li><strong className="text-foreground">Hosting:</strong> Vercel (serverless, auto-scaling, DDoS protection)</li>
              <li><strong className="text-foreground">Database:</strong> Supabase (managed PostgreSQL on AWS)</li>
              <li><strong className="text-foreground">Edge Network:</strong> Vercel Edge Network with global CDN</li>
              <li><strong className="text-foreground">API Functions:</strong> Serverless functions with CORS headers and JWT validation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">SOC 2 Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conduit is not yet SOC 2 certified. We are working toward SOC 2 Type II compliance and have implemented many of its controls, including access management, encryption, monitoring, and incident response procedures. Our infrastructure providers (Supabase, Vercel, Stripe) are SOC 2 certified.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data Handling Practices</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Least-privilege access: team members only see workspaces they belong to</li>
              <li>Audit logging for sensitive operations (content publish, settings changes)</li>
              <li>Regular dependency updates and vulnerability scanning</li>
              <li>Environment variables stored securely in Vercel (never committed to code)</li>
              <li>CORS policies restrict API access to authorized origins</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Responsible Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you discover a security vulnerability in Conduit, we appreciate your help in disclosing it responsibly. Please report vulnerabilities to:
            </p>
            <p className="text-foreground font-mono text-sm bg-muted rounded-lg px-4 py-3">
              security@getconduit.io
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We aim to acknowledge reports within 24 hours and provide a resolution timeline within 72 hours. We ask that you do not publicly disclose vulnerabilities until we have had a reasonable opportunity to address them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Questions?</h2>
            <p className="text-muted-foreground leading-relaxed">
              For security-related questions, email security@getconduit.io. For general inquiries, visit our <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
