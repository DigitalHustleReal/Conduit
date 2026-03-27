'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Conduit</Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-3">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Have a question, suggestion, or want to partner? We respond within 24 hours.
        </p>

        <div className="grid gap-12 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="border border-border rounded-lg p-8 text-center">
                <div className="text-3xl mb-3">&#10003;</div>
                <h3 className="text-xl font-bold mb-2">Message sent</h3>
                <p className="text-muted-foreground">Thanks for reaching out. We will get back to you within 24 hours.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5">Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1.5">Subject</label>
                  <select
                    id="subject"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  >
                    <option value="">Select a topic</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Support</option>
                    <option value="sales">Sales</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1.5">Message</label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Sidebar info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-border rounded-lg p-5">
              <h3 className="font-semibold mb-3">Email</h3>
              <p className="text-sm text-muted-foreground">hello@getconduit.io</p>
            </div>

            <div className="border border-border rounded-lg p-5">
              <h3 className="font-semibold mb-3">Bug Reports</h3>
              <p className="text-sm text-muted-foreground mb-2">Found a bug? Open an issue on GitHub.</p>
              <a
                href="https://github.com/digitalhustle/conduit/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                GitHub Issues &rarr;
              </a>
            </div>

            <div className="border border-border rounded-lg p-5">
              <h3 className="font-semibold mb-3">Follow Us</h3>
              <div className="space-y-2 text-sm">
                <a href="https://twitter.com/getconduit" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Twitter/X &rarr;
                </a>
                <a href="https://github.com/digitalhustle/conduit" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-foreground transition-colors">
                  GitHub &rarr;
                </a>
              </div>
            </div>

            <div className="border border-border rounded-lg p-5">
              <h3 className="font-semibold mb-3">Response Time</h3>
              <p className="text-sm text-muted-foreground">We respond within 24 hours on business days.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2026 Conduit by DigitalHustle</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
