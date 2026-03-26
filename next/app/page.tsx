'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const FEATURES = [
  { title: '113 AI Agents', desc: 'Autonomous agents handle content creation, SEO audits, keyword research, interlinking, and distribution.', icon: '&#x1f916;' },
  { title: '21 AI Tools', desc: 'AI Studio with tools for titles, meta descriptions, outlines, rewrites, translations, and more.', icon: '&#x2726;' },
  { title: '5 AI Providers', desc: 'Claude, GPT-4, Gemini, Mistral, and Groq. Use ours or bring your own API keys.', icon: '&#x1f9e0;' },
  { title: 'Headless CMS', desc: 'Full content management with collections, schemas, versioning, and a REST API for any frontend.', icon: '&#x1f4e6;' },
];

const PRICING = [
  { plan: 'Free', price: '$0', period: '/forever', calls: '100 AI calls/mo', features: ['5 articles', '1 team member', 'Basic agents', 'Community support'], cta: 'Start Free', highlight: false },
  { plan: 'Pro', price: '$29', period: '/month', calls: '1,000 AI calls/mo', features: ['Unlimited articles', '5 team members', 'All agents', 'Priority support', 'API access'], cta: 'Start Pro', highlight: true },
  { plan: 'Business', price: '$99', period: '/month', calls: '10,000 AI calls/mo', features: ['Unlimited everything', '15 team members', 'White-label', 'Dedicated support', 'Custom integrations'], cta: 'Start Business', highlight: false },
  { plan: 'BYOK', price: '$0', period: '/forever', calls: 'Unlimited (your keys)', features: ['Bring your own API keys', 'Unlimited AI calls', 'All features', 'Self-serve'], cta: 'Get Started', highlight: false },
];

const FAQ = [
  { q: 'What is Conduit?', a: 'Conduit is an AI-native content operations platform. It combines a full CMS with 113 autonomous AI agents that handle everything from keyword research to publishing.' },
  { q: 'Do I need my own AI API keys?', a: 'No. Free, Pro, and Business plans include AI credits. But if you have your own API keys from OpenAI, Anthropic, Google, Mistral, or Groq, you can use them with the BYOK plan for unlimited calls.' },
  { q: 'How is this different from Jasper or Copy.ai?', a: 'Those are AI text generators. Conduit is a complete content operations platform with CMS, pipeline management, SEO scoring, autonomous agents, and publishing workflows.' },
  { q: 'Can I use Conduit as a headless CMS?', a: 'Yes. Conduit exposes REST APIs for all content, collections, and schemas. You can use it with any frontend framework.' },
  { q: 'What AI models do you support?', a: 'Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google), Mistral, and Groq. You can switch providers per workspace.' },
  { q: 'Is there a free trial?', a: 'The Free plan is free forever with 100 AI calls per month. No credit card required.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">Conduit</span>
            <Badge variant="secondary" className="text-[9px]">Beta</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</a>
            <Link href="/dashboard"><Button size="sm">Open App</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 text-violet-400 border-violet-400/30">Now in public beta</Badge>
          <h1 className="text-5xl font-black leading-tight mb-6">
            Your AI Content Team.<br />
            <span className="text-violet-400">113 Agents.</span> Zero Hiring.
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            The first platform where AI agents handle content operations end-to-end &mdash;
            from keyword research to publishing to performance monitoring.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard"><Button size="lg" className="px-8">Start Free</Button></Link>
            <a href="#features"><Button size="lg" variant="outline" className="px-8">See Features</Button></a>
          </div>
          <p className="text-xs text-zinc-500 mt-4">No credit card required. 100 AI calls/month free.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to scale content</h2>
          <div className="grid grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="text-3xl mb-4" dangerouslySetInnerHTML={{ __html: f.icon }} />
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-center text-zinc-400 mb-12">Start free. Scale when you need to.</p>
          <div className="grid grid-cols-4 gap-4">
            {PRICING.map((p) => (
              <Card key={p.plan} className={`${p.highlight ? 'bg-violet-500/10 border-violet-500/50 ring-1 ring-violet-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                <CardContent className="p-6">
                  {p.highlight && <Badge className="mb-3 bg-violet-500 text-white text-[10px]">Most Popular</Badge>}
                  <h3 className="font-bold text-lg">{p.plan}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-3xl font-black">{p.price}</span>
                    <span className="text-zinc-500 text-sm">{p.period}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">{p.calls}</p>
                  <ul className="space-y-2 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="text-sm text-zinc-300 flex items-center gap-2">
                        <span className="text-emerald-400 text-xs">&#x2713;</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard">
                    <Button variant={p.highlight ? 'default' : 'outline'} className="w-full" size="sm">{p.cta}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-zinc-900 transition-colors">
                  <span className="font-medium text-sm">{item.q}</span>
                  <span className="text-zinc-500">{openFaq === i ? '-' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-bold">Conduit</span>
            <span className="text-zinc-500 text-sm ml-2">AI-native content operations</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">App</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
