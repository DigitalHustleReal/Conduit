'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const AGENTS = [
  { name: 'Content Autopilot', icon: '\u{1F680}', type: 'AI', desc: 'Generates full articles from keywords', status: 'Running...' },
  { name: 'SEO Guardian', icon: '\u{1F6E1}', type: 'Hybrid', desc: 'Monitors and fixes SEO issues', status: 'Last run: 2m ago' },
  { name: 'Keyword Opportunity', icon: '\u{1F50D}', type: 'AI', desc: 'Discovers high-value keywords', status: 'Last run: 5m ago' },
  { name: 'Pipeline Manager', icon: '\u{1F4CB}', type: 'Heuristic', desc: 'Keeps content workflow on track', status: 'Running...' },
  { name: 'Health Monitor', icon: '\u{1F3E5}', type: 'Heuristic', desc: 'Checks content health every 10 min', status: 'Last run: 1m ago' },
  { name: 'Content Refresh', icon: '\u{267B}', type: 'AI', desc: 'Updates stale content automatically', status: 'Last run: 12m ago' },
  { name: 'Interlink Builder', icon: '\u{1F517}', type: 'AI', desc: 'Builds internal link network', status: 'Last run: 8m ago' },
  { name: 'Smart Onboarding', icon: '\u{2728}', type: 'AI', desc: 'Guides new users to first publish', status: 'Last run: 3m ago' },
];

const PRICING = [
  { plan: 'Free', price: 0, period: '/forever', calls: '100 AI calls/month', features: ['5 articles', 'Core agents', 'Email support', 'Community access'], cta: 'Start Free', highlight: false, byok: false },
  { plan: 'Pro', price: 29, period: '/month', calls: '1,000 AI calls/month', features: ['Unlimited articles', 'All agents + autopilot', 'Priority support', 'API access', 'Version history', 'GSC integration'], cta: 'Start Pro', highlight: true, byok: false },
  { plan: 'Business', price: 99, period: '/month', calls: '10,000 AI calls/month', features: ['Unlimited everything', 'White-label', 'SSO & SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee'], cta: 'Start Business', highlight: false, byok: false },
  { plan: 'BYOK', price: 0, period: '/forever', calls: 'Unlimited (your API keys)', features: ['All Pro features', '5 providers supported', 'Zero platform fees', 'Self-serve forever'], cta: 'Get Started', highlight: false, byok: true },
];

const FAQ = [
  { q: 'What is Conduit?', a: 'Conduit is an AI-native content operations platform. It combines a full CMS with autonomous AI agents that handle everything from keyword research to publishing.' },
  { q: 'Do I need my own AI API keys?', a: 'No. Free, Pro, and Business plans include AI credits. But if you have your own API keys from OpenAI, Anthropic, Google, Mistral, or Groq, you can use them with the BYOK plan for unlimited calls.' },
  { q: 'How is this different from Jasper or Copy.ai?', a: 'Those are AI text generators. Conduit is a complete content operations platform with CMS, pipeline management, SEO scoring, autonomous agents, and publishing workflows.' },
  { q: 'Can I use Conduit as a headless CMS?', a: 'Yes. Conduit exposes REST APIs for all content, collections, and schemas. You can use it with any frontend framework.' },
  { q: 'What AI models do you support?', a: 'Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google), Mistral, and Groq. You can switch providers per workspace.' },
  { q: 'Is there a free trial?', a: 'The Free plan is free forever with 100 AI calls per month. No credit card required.' },
];

const USE_CASES: Record<string, { title: string; points: string[] }> = {
  solo: { title: 'Solo Creators', points: ['Scale from 1 to 100+ articles/month', 'Content Autopilot writes while you strategize', 'One-person team with the output of ten'] },
  agency: { title: 'Agencies', points: ['Manage 5-20 client sites from one dashboard', 'White-label Conduit under your brand', 'Team roles: Admin, Editor, Writer'] },
  niche: { title: 'Niche Sites', points: ['Programmatic SEO at scale', 'Bulk generate with AI agents', 'Auto interlink across 1,000+ pages'] },
};

/* ------------------------------------------------------------------ */
/*  Scroll-reveal hook                                                 */
/* ------------------------------------------------------------------ */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, cls: visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6' };
}

/* ------------------------------------------------------------------ */
/*  Animated Dashboard Preview                                         */
/* ------------------------------------------------------------------ */

const PREVIEW_NAV = [
  { icon: '\u26A1', label: 'Dashboard', active: true },
  { icon: '\uD83D\uDCC4', label: 'Content', active: false },
  { icon: '\u2726', label: 'AI Studio', active: false },
  { icon: '\uD83E\uDD16', label: 'Agents', active: false },
  { icon: '\uD83D\uDD0D', label: 'SEO', active: false },
];

const PREVIEW_ROWS = [
  { title: 'Best Credit Cards 2026', score: 94, status: 'Published', statusColor: 'bg-emerald-400' },
  { title: 'How to Start a Blog in 2026', score: 87, status: 'Review', statusColor: 'bg-blue-400' },
  { title: 'Top 10 AI Tools for Content', score: 91, status: 'Published', statusColor: 'bg-emerald-400' },
  { title: 'SEO Checklist for Beginners', score: 72, status: 'Draft', statusColor: 'bg-amber-400' },
];

const AGENT_LOG = "SEO Guardian fixed meta description on 'Best Credit Cards 2026'... AI Score improved from 78 to 94.";

function useCountUp(target: number, duration: number, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const steps = Math.ceil(duration / 30);
    const inc = target / steps;
    const id = setInterval(() => {
      start += inc;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.round(start));
    }, 30);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return val;
}

function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [typedLen, setTypedLen] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const published = useCountUp(47, 1800, visible);
  const drafts = useCountUp(12, 1200, visible);
  const aiScore = useCountUp(94, 2000, visible);
  const agentsNum = useCountUp(8, 1000, visible);

  // Typing effect for agent log
  useEffect(() => {
    if (!visible) return;
    const delay = setTimeout(() => {
      const id = setInterval(() => {
        setTypedLen(prev => {
          if (prev >= AGENT_LOG.length) { clearInterval(id); return prev; }
          return prev + 1;
        });
      }, 35);
      return () => clearInterval(id);
    }, 3000);
    return () => clearTimeout(delay);
  }, [visible]);

  return (
    <div ref={ref} className="mt-16 mx-auto max-w-3xl rounded-xl overflow-hidden anim-preview-glow border border-blue-500/20" style={{ transform: 'perspective(1200px) rotateX(2deg)' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-b border-border">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">Conduit &mdash; Dashboard</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-mono">3 agents running</span>
        </div>
      </div>

      <div className="flex bg-card/80 backdrop-blur relative" style={{ minHeight: 320 }}>
        {/* Mini sidebar */}
        <div className="w-36 border-r border-border bg-card py-3 shrink-0 hidden sm:block">
          <div className="px-3 mb-3 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-[8px] text-white font-bold">{'\u2726'}</div>
            <span className="text-[10px] font-bold text-foreground">Conduit</span>
          </div>
          {PREVIEW_NAV.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded text-[11px] transition-colors ${
                item.active
                  ? 'bg-blue-500/15 text-blue-400 border-l-2 border-blue-500'
                  : 'text-muted-foreground'
              } ${i === 2 ? 'anim-nav-hover' : ''}`}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Published', val: published, color: 'text-emerald-400', border: 'border-l-emerald-500' },
              { label: 'Drafts', val: drafts, color: 'text-amber-400', border: 'border-l-amber-500' },
              { label: 'AI Score', val: aiScore, color: 'text-blue-400', border: 'border-l-blue-500' },
              { label: 'Agents', val: agentsNum, color: 'text-cyan-400', border: 'border-l-cyan-500' },
            ].map(s => (
              <div key={s.label} className={`bg-muted rounded-lg p-2.5 border border-border border-l-2 ${s.border}`}>
                <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
                <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Content list */}
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-mono">Recent Content</p>
            <div className="space-y-1">
              {PREVIEW_ROWS.map((row, i) => (
                <div
                  key={row.title}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50 text-[11px] ${visible ? 'anim-slide-row' : 'opacity-0'}`}
                  style={{ animationDelay: `${1.5 + i * 0.3}s` }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${row.statusColor} shrink-0`} />
                  <span className="text-foreground/80 truncate flex-1">{row.title}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${row.score >= 90 ? 'bg-emerald-400' : row.score >= 80 ? 'bg-blue-400' : 'bg-amber-400'} ${visible ? 'anim-bar-fill' : ''}`}
                      style={{ '--bar-w': `${row.score}%`, animationDelay: `${2 + i * 0.3}s` } as React.CSSProperties}
                    />
                  </div>
                  <span className="text-muted-foreground text-[10px] w-6 text-right font-mono">{row.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent activity log */}
          <div className="bg-muted/50 rounded-lg p-2.5 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">Agent Activity</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
              {AGENT_LOG.slice(0, typedLen)}
              {typedLen < AGENT_LOG.length && <span className="anim-typing-cursor text-blue-400">|</span>}
            </p>
          </div>
        </div>

        {/* Animated cursor */}
        {visible && (
          <div className="anim-cursor absolute pointer-events-none z-20" style={{ top: '50%', left: '50%' }}>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M1 1L1 15L5 11L9 19L12 17.5L8 10L13 10L1 1Z" fill="white" stroke="black" strokeWidth="1" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('solo');
  const [annual, setAnnual] = useState(false);

  /* scroll-reveal refs for each section */
  const r1 = useReveal(); const r2 = useReveal(); const r3 = useReveal();
  const r4 = useReveal(); const r5 = useReveal(); const r6 = useReveal();
  const r7 = useReveal(); const r8 = useReveal(); const r9 = useReveal();

  /* nav background on scroll */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const smoothScroll = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ---- inline keyframes ---- */}
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow-pulse{0%,100%{opacity:.45}50%{opacity:.75}}
        @keyframes preview-glow{0%,100%{box-shadow:0 0 30px rgba(59,130,246,.15),0 0 60px rgba(59,130,246,.05)}50%{box-shadow:0 0 40px rgba(59,130,246,.25),0 0 80px rgba(59,130,246,.1)}}
        @keyframes slide-in-row{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes cursor-path{0%{top:50%;left:50%;opacity:0}5%{opacity:1}10%{top:30%;left:12%}20%{top:30%;left:12%}30%{top:55%;left:50%}45%{top:55%;left:50%}55%{top:78%;left:40%}70%{top:78%;left:40%}80%{top:50%;left:50%;opacity:1}85%{opacity:0}100%{top:50%;left:50%;opacity:0}}
        @keyframes typing-cursor{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes nav-hover{0%,15%{background:transparent}20%,35%{background:rgba(59,130,246,.1)}40%,100%{background:transparent}}
        @keyframes bar-fill{from{width:0}to{width:var(--bar-w)}}
        .anim-float{animation:float 6s ease-in-out infinite}
        .anim-glow{animation:glow-pulse 4s ease-in-out infinite}
        .anim-preview-glow{animation:preview-glow 3s ease-in-out infinite}
        .anim-slide-row{animation:slide-in-row .5s ease-out both}
        .anim-cursor{animation:cursor-path 15s ease-in-out infinite}
        .anim-typing-cursor{animation:typing-cursor .8s step-end infinite}
        .anim-nav-hover{animation:nav-hover 15s ease-in-out infinite}
        .anim-bar-fill{animation:bar-fill 1.5s ease-out both}
        .reveal-base{transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
      `}</style>

      {/* ========== 1. STICKY NAV ========== */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-background/80 border-b border-border shadow-lg shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <a href="#" className="text-xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Conduit</a>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" onClick={smoothScroll('features')} className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#agents" onClick={smoothScroll('agents')} className="text-muted-foreground hover:text-foreground transition-colors">Agents</a>
            <a href="#pricing" onClick={smoothScroll('pricing')} className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" onClick={smoothScroll('faq')} className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow border-0">Open App</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== 2. HERO ========== */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* bg glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] anim-glow pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div ref={r1.ref} className={`reveal-base ${r1.cls} max-w-4xl mx-auto text-center relative z-10`}>
          <Badge variant="outline" className="mb-6 text-blue-300 border-blue-400/30 bg-blue-500/10 px-4 py-1 text-xs tracking-wide">
            <span className="mr-1.5 text-blue-400">{'\u2726'}</span>Now in public beta &mdash; Start free today
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-6">
            Your AI Content Team.<br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">AI agents that work while you sleep.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Deploy autonomous AI agents that research, write, optimize, and distribute your content&mdash;around the clock, without supervision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto px-8 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 transition-all border-0 text-sm font-semibold">
                Start Free &mdash; No Card Required
              </Button>
            </Link>
            <a href="#features" onClick={smoothScroll('features')}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-border text-foreground/80 hover:text-foreground hover:border-border transition-all text-sm">
                Watch Demo &rarr;
              </Button>
            </a>
          </div>

          <p className="text-xs text-muted-foreground mt-5 tracking-wide">Free forever &bull; No credit card &bull; 100 AI calls/month</p>

          {/* Animated dashboard preview */}
          <DashboardPreview />
        </div>
      </section>

      {/* ========== 3. METRICS BAR ========== */}
      <section ref={r2.ref} className={`reveal-base ${r2.cls} bg-card/60 border-y border-border py-12 px-6`}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '24/7', label: 'Autonomous Monitoring' },
            { num: '5', label: 'AI Providers Built In' },
            { num: '0', label: 'Manual Work Required' },
            { num: '$0', label: 'To Start' },
          ].map(m => (
            <div key={m.label}>
              <p className="text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{m.num}</p>
              <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== 4. FEATURES ========== */}
      <section id="features" className="py-24 px-6">
        <div ref={r3.ref} className={`reveal-base ${r3.cls} max-w-6xl mx-auto`}>
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Everything you need to scale content</h2>
            <div className="mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          </div>

          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">Core Platform</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Autonomous AI Agents</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">Your agents observe your content, detect issues, and fix them&mdash;automatically. SEO problems get patched. Stale content gets refreshed. Internal links get built. All while you focus on strategy.</p>
              <ul className="space-y-3 text-sm text-foreground/80">
                {['Work 24/7 without breaks or supervision', 'Heuristic + AI hybrid intelligence', 'Auto-fix SEO issues as they appear', 'Core agents plus specialized micro-agents'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">{'\u2713'}</span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="border border-blue-500/20 rounded-xl bg-card/60 p-6 backdrop-blur shadow-lg shadow-blue-500/5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-sm">Agent: SEO Guardian</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Running</span>
              </div>
              <div className="space-y-3 text-sm">
                {[['Last Fix', '2 min ago'], ['Issues Fixed', '47'], ['Uptime', '99.8%'], ['Next Scan', '38s']].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1 bg-card/60 rounded-xl p-6 border border-border">
              <p className="text-xs text-muted-foreground mb-4 font-medium tracking-wide uppercase">AI Studio</p>
              <div className="grid grid-cols-3 gap-2">
                {['Title Gen', 'Meta Desc', 'Outline', 'Rewrite', 'Translate', 'Social Brief', 'Expand', 'Summarize', 'Tone Shift'].map(t => (
                  <div key={t} className="bg-muted rounded-lg px-3 py-2.5 text-xs text-foreground/80 text-center border border-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-colors cursor-default">{t}</div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">AI Studio</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">21 Professional AI Tools</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">A complete toolkit for every content task. Generate titles, meta descriptions, outlines, rewrites, translations, and social briefs&mdash;powered by your choice of 5 AI providers.</p>
              <ul className="space-y-3 text-sm text-foreground/80">
                {['Switch between Claude, GPT-4, Gemini, Mistral, Groq', 'Pinned favorites for instant access', 'Prompt library with 33 built-in templates'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">{'\u2713'}</span>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">API-First</Badge>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Headless CMS + Any Frontend</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">Conduit exposes REST endpoints for all content, collections, and schemas. Connect any frontend&mdash;Next.js, Astro, Remix, or your custom stack.</p>
              <ul className="space-y-3 text-sm text-foreground/80">
                {['Full REST API with authentication', 'Collections, schemas, versioning out of the box', 'Webhooks for real-time event streaming'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">{'\u2713'}</span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden font-mono text-sm">
              <div className="px-4 py-2 bg-muted border-b border-border text-xs text-muted-foreground">api-example.ts</div>
              <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed"><code>{`const client = `}<span className="text-blue-400">new</span>{` ConduitClient({
  url: `}<span className="text-emerald-400">{`'https://api.conduit.io'`}</span>{`,
  key: `}<span className="text-emerald-400">{`'ck_live_...'`}</span>{`
});

const articles = `}<span className="text-blue-400">await</span>{` client.getContent({
  collection: `}<span className="text-emerald-400">{`'blog'`}</span>{`,
  limit: `}<span className="text-amber-400">10</span>{`
});`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 5. AGENT SHOWCASE ========== */}
      <section id="agents" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/[0.03] to-transparent pointer-events-none" />
        <div ref={r4.ref} className={`reveal-base ${r4.cls} max-w-6xl mx-auto relative z-10`}>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Your AI team. Always on.</h2>
            <p className="text-muted-foreground text-lg">Every content task&mdash;from keyword research to distribution&mdash;handled autonomously.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENTS.map(a => (
              <div key={a.name} className="group bg-card/60 border border-border rounded-xl p-5 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1 cursor-default">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{a.icon}</span>
                  <Badge variant="outline" className={`text-[10px] ${a.type === 'AI' ? 'text-blue-400 border-blue-500/30' : a.type === 'Hybrid' ? 'text-cyan-400 border-cyan-500/30' : 'text-amber-400 border-amber-500/30'}`}>{a.type}</Badge>
                </div>
                <h4 className="font-semibold text-sm mb-1">{a.name}</h4>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{a.desc}</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.status.startsWith('Running') ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                  <span className="text-muted-foreground">{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 6. BEFORE / AFTER ========== */}
      <section className="py-24 px-6">
        <div ref={r5.ref} className={`reveal-base ${r5.cls} max-w-5xl mx-auto`}>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-16">The old way vs. Conduit</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* OLD WAY */}
            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-6">
              <p className="text-sm font-semibold text-red-400 mb-5 tracking-wide uppercase">The old way</p>
              <ul className="space-y-3 text-sm text-foreground/80">
                {[
                  'WordPress + 15 plugins ($50+/mo)',
                  'Ahrefs for keywords ($99/mo)',
                  'Jasper for AI writing ($49/mo)',
                  'Notion for pipeline (free but slow)',
                  'Manual SEO checks (hours/week)',
                  'No automation whatsoever',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2"><span className="text-red-400/80 mt-0.5 shrink-0">{'\u2718'}</span>{item}</li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-red-500/10 text-xs text-muted-foreground">
                <span className="text-red-400 font-bold">$198+/month</span> &bull; 5 tools &bull; 20+ hours/week
              </div>
            </div>

            {/* CONDUIT */}
            <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-6">
              <p className="text-sm font-semibold text-emerald-400 mb-5 tracking-wide uppercase">With Conduit</p>
              <ul className="space-y-3 text-sm text-foreground/80">
                {[
                  'Full CMS + AI + SEO + Pipeline',
                  'AI agents handle everything autonomously',
                  'One dashboard, zero plugins',
                  'Autonomous \u2014 runs while you sleep',
                  '5 AI providers built in',
                  'BYOK = free forever',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5 shrink-0">{'\u2713'}</span>{item}</li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-emerald-500/10 text-xs text-muted-foreground">
                <span className="text-emerald-400 font-bold">$0-29/month</span> &bull; 1 tool &bull; 2 hours/week
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 7. USE CASES ========== */}
      <section className="py-24 px-6 border-t border-border">
        <div ref={r6.ref} className={`reveal-base ${r6.cls} max-w-3xl mx-auto`}>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">Built for how you work</h2>

          <div className="flex justify-center gap-2 mb-10">
            {Object.entries(USE_CASES).map(([key, val]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {val.title}
              </button>
            ))}
          </div>

          <div className="bg-card/60 border border-border rounded-xl p-8">
            <h3 className="font-bold text-lg mb-4">{USE_CASES[activeTab].title}</h3>
            <ul className="space-y-4">
              {USE_CASES[activeTab].points.map(p => (
                <li key={p} className="flex items-start gap-3 text-foreground/80">
                  <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs text-blue-400 shrink-0 mt-0.5">{'\u2713'}</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ========== 8. PRICING ========== */}
      <section id="pricing" className="py-24 px-6 relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />

        <div ref={r7.ref} className={`reveal-base ${r7.cls} max-w-6xl mx-auto relative z-10`}>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start free. Scale when ready.</p>

            {/* Annual / Monthly toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className={`text-sm font-medium transition-colors ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${annual ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={`text-sm font-medium transition-colors ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] px-2 py-0.5">Save 20%</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {PRICING.map(p => {
              const monthlyPrice = p.price;
              const annualPrice = Math.round(p.price * 0.8);
              const displayPrice = p.price === 0 ? 0 : (annual ? annualPrice : monthlyPrice);
              const showAnnualSavings = !annual && p.price > 0;

              return (
                <div key={p.plan}
                  className={`group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? 'bg-card/60 backdrop-blur-sm border-2 border-blue-500/40 shadow-xl shadow-blue-500/10 lg:-mt-4 lg:pb-8 lg:pt-8'
                      : p.byok
                        ? 'bg-card/60 backdrop-blur-sm border-2 border-dashed border-border hover:border-border'
                        : 'bg-card/60 backdrop-blur-sm border border-border hover:border-border'
                  }`}
                  style={p.highlight ? { boxShadow: '0 0 40px rgba(59,130,246,0.1), 0 4px 30px rgba(59,130,246,0.08)' } : undefined}
                >
                  {/* Most Popular badge */}
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] px-4 py-0.5 shadow-lg shadow-blue-600/30 border-0 font-semibold tracking-wide">Most Popular</Badge>
                    </div>
                  )}
                  {/* Power Users badge */}
                  {p.byok && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="outline" className="text-foreground/80 border-border bg-muted text-[10px] px-4 py-0.5 font-semibold tracking-wide">Power Users</Badge>
                    </div>
                  )}

                  <h3 className="font-bold text-lg text-foreground">{p.plan}</h3>

                  {/* Price */}
                  <div className="mt-4 mb-1 flex items-baseline gap-1.5">
                    <span className="text-5xl font-black tracking-tight text-foreground">${displayPrice}</span>
                    <span className="text-muted-foreground text-sm">{p.price === 0 ? '/forever' : (annual ? '/mo, billed yearly' : '/month')}</span>
                  </div>

                  {/* Annual savings hint */}
                  {showAnnualSavings && (
                    <p className="text-xs text-muted-foreground mb-4">
                      <span className="line-through">${monthlyPrice}</span>{' '}
                      <span className="text-emerald-400">${annualPrice}/mo with annual</span>
                    </p>
                  )}
                  {!showAnnualSavings && <div className="mb-4" />}

                  {/* AI calls badge */}
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mb-6 ${
                    p.highlight
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                      : p.byok
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                    <span>{'\u2726'}</span>
                    {p.calls}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {p.features.map(f => (
                      <li key={f} className="text-sm text-foreground/80 flex items-start gap-2.5">
                        <span className="text-blue-400 text-sm mt-0.5 shrink-0">{'\u2713'}</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href="/dashboard" className="block mt-auto">
                    <Button
                      variant={p.highlight ? 'default' : 'outline'}
                      className={`w-full font-semibold transition-all ${
                        p.highlight
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 border-0'
                          : p.byok
                            ? 'border-border text-foreground hover:bg-muted hover:text-foreground hover:border-border'
                            : 'border-border text-foreground/80 hover:bg-muted hover:text-foreground hover:border-border'
                      }`}
                      size="sm"
                    >
                      {p.cta}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">All plans include: Supabase auth &bull; 5 AI providers &bull; Headless CMS API</p>
        </div>
      </section>

      {/* ========== 9. FAQ ========== */}
      <section id="faq" className="py-24 px-6 border-t border-border">
        <div ref={r8.ref} className={`reveal-base ${r8.cls} max-w-3xl mx-auto`}>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12">Questions? We&apos;ve got answers.</h2>

          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-card/50 transition-colors">
                  <span className="font-medium text-sm">{item.q}</span>
                  <svg className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: openFaq === i ? '200px' : '0px' }}>
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 10. FINAL CTA ========== */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] anim-glow" />
        </div>
        <div ref={r9.ref} className={`reveal-base ${r9.cls} max-w-2xl mx-auto text-center relative z-10`}>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Stop managing tools.<br />Start managing strategy.</h2>
          <p className="text-muted-foreground text-lg mb-8">Free forever. No credit card. Your AI team is ready.</p>
          <Link href="/dashboard">
            <Button size="lg" className="px-10 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 transition-all border-0 font-semibold">
              Get Started Free &rarr;
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-5">Join 500+ content creators already using Conduit</p>
        </div>
      </section>

      {/* ========== 11. FOOTER ========== */}
      <footer className="border-t border-border py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Product</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {['Features', 'Pricing', 'API Docs', 'Changelog'].map(l => <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Resources</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {['Blog', 'Documentation', 'Help Center', 'Status'].map(l => <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Company</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {['About', 'Careers', 'Contact', 'Press'].map(l => <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-foreground">Legal</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {['Privacy', 'Terms', 'Security'].map(l => <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>)}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border gap-4">
            <p className="text-xs text-muted-foreground">&copy; 2026 Conduit. AI-native content operations.</p>
            <div className="flex gap-4">
              {['X', 'GH', 'LI', 'YT'].map(s => (
                <a key={s} href="#" className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-mono">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
