'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PHASE_DURATION = 3000; // 3s per phase
const TOTAL_PHASES = 5;
const CYCLE = PHASE_DURATION * TOTAL_PHASES; // 15s total

const STAT_CARDS = [
  { label: 'Published', value: 47, color: '#34d399', icon: '\u2713' },
  { label: 'Drafts', value: 12, color: '#fbbf24', icon: '\u270E' },
  { label: 'AI Score', value: 94, color: '#60a5fa', icon: '\u2726' },
  { label: 'Agents', value: 8, color: '#22d3ee', icon: '\u2699' },
];

const CONTENT_ROWS = [
  { title: 'Best Credit Cards 2026', score: 94, status: 'Published', color: '#34d399' },
  { title: 'How to Start a Blog', score: 87, status: 'Review', color: '#60a5fa' },
  { title: 'Top 10 AI Tools', score: 91, status: 'Published', color: '#34d399' },
];

const TYPING_TITLE = '10 Best Investment Strategies for 2026';

const ANALYTICS_POINTS = [20, 35, 28, 55, 48, 72, 65, 85, 78, 95, 88, 110];

/* ------------------------------------------------------------------ */
/*  HeroDemo                                                           */
/* ------------------------------------------------------------------ */

export default function HeroDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Intersection observer to start animation when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (!visible) return;
    startTimeRef.current = performance.now();

    function tick(now: number) {
      const elapsed = (now - startTimeRef.current) % CYCLE;
      const currentPhase = Math.floor(elapsed / PHASE_DURATION);
      const progress = (elapsed % PHASE_DURATION) / PHASE_DURATION;
      setPhase(currentPhase);
      setPhaseProgress(progress);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible]);

  // Derived animation values
  const countUpValue = useCallback((target: number) => {
    if (phase > 0) return target;
    return Math.round(target * Math.min(phaseProgress * 1.5, 1));
  }, [phase, phaseProgress]);

  const typedChars = phase === 1
    ? Math.min(Math.floor(phaseProgress * TYPING_TITLE.length * 1.3), TYPING_TITLE.length)
    : phase > 1 ? TYPING_TITLE.length : 0;

  const aiScoreValue = phase === 1
    ? Math.min(Math.round(87 * Math.min(phaseProgress * 2, 1)), 87)
    : phase > 1 ? 87 : 0;

  const seoBarWidth = phase === 1
    ? Math.min(phaseProgress * 2 * 87, 87)
    : phase > 1 ? 87 : 0;

  const seoImproved = phase === 2 && phaseProgress > 0.5;
  const toastVisible = phase === 2 && phaseProgress > 0.6;

  const publishFlash = phase === 3 && phaseProgress > 0.2 && phaseProgress < 0.5;
  const isPublished = phase === 3 && phaseProgress > 0.2;
  const showConfetti = phase === 3 && phaseProgress > 0.3 && phaseProgress < 0.8;
  const showSocial = phase === 3 && phaseProgress > 0.4;

  const analyticsProgress = phase === 4 ? phaseProgress : 0;

  return (
    <div ref={containerRef} className="mt-16 mx-auto w-full max-w-4xl">
      {/* Keyframes */}
      <style>{`
        @keyframes hero-demo-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(59,130,246,.12), 0 0 80px rgba(59,130,246,.04); }
          50% { box-shadow: 0 0 60px rgba(59,130,246,.22), 0 0 120px rgba(59,130,246,.08); }
        }
        @keyframes hero-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes hero-typing-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes hero-confetti-1 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-40px) rotate(180deg); opacity: 0; }
        }
        @keyframes hero-confetti-2 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-35px) rotate(-150deg); opacity: 0; }
        }
        @keyframes hero-confetti-3 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-45px) rotate(200deg); opacity: 0; }
        }
        @keyframes hero-pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
          70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes hero-toast-in {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes hero-chart-draw {
          from { stroke-dashoffset: 500; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes hero-number-tick {
          0% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
        .hero-demo-shell { animation: hero-demo-glow 3s ease-in-out infinite; }
        .hero-blink { animation: hero-blink 2s ease-in-out infinite; }
        .hero-typing-cursor { animation: hero-typing-cursor .6s step-end infinite; }
        .hero-pulse-green { animation: hero-pulse-green 1s ease-out; }
        .hero-toast-in { animation: hero-toast-in .4s ease-out both; }
      `}</style>

      <div
        className="hero-demo-shell rounded-xl overflow-hidden border border-blue-500/20"
        style={{ transform: 'perspective(1200px) rotateX(2deg)' }}
      >
        {/* Browser chrome bar */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#1a1b2e', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          <span className="ml-3 text-xs font-mono" style={{ color: '#6b7280' }}>
            Conduit &mdash; {['Dashboard', 'Editor', 'Agents', 'Publishing', 'Analytics'][phase]}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full hero-blink" style={{ background: '#34d399' }} />
            <span className="text-[10px] font-mono" style={{ color: '#34d399' }}>3 agents active</span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex" style={{ background: '#0f1021', minHeight: 340 }}>
          {/* Mini sidebar */}
          <div className="w-36 shrink-0 py-3 hidden sm:block" style={{ borderRight: '1px solid rgba(255,255,255,.06)', background: '#13142a' }}>
            <div className="px-3 mb-3 flex items-center gap-1.5">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] text-white font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                {'\u2726'}
              </div>
              <span className="text-[10px] font-bold text-white">Conduit</span>
            </div>
            {[
              { icon: '\u26A1', label: 'Dashboard', idx: 0 },
              { icon: '\uD83D\uDCDD', label: 'Content', idx: 1 },
              { icon: '\uD83E\uDD16', label: 'Agents', idx: 2 },
              { icon: '\uD83D\uDE80', label: 'Publish', idx: 3 },
              { icon: '\uD83D\uDCC8', label: 'Analytics', idx: 4 },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded text-[11px] transition-all duration-500"
                style={{
                  background: phase === item.idx ? 'rgba(59,130,246,.15)' : 'transparent',
                  color: phase === item.idx ? '#60a5fa' : '#6b7280',
                  borderLeft: phase === item.idx ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>

          {/* Main area with phase content */}
          <div className="flex-1 p-4 overflow-hidden relative">
            {/* Phase indicators */}
            <div className="absolute top-2 right-3 flex gap-1">
              {Array.from({ length: TOTAL_PHASES }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: phase === i ? '#3b82f6' : 'rgba(255,255,255,.1)',
                    transform: phase === i ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {/* PHASE 0: Dashboard */}
            <div
              className="absolute inset-4 transition-all duration-500"
              style={{
                opacity: phase === 0 ? 1 : 0,
                transform: phase === 0 ? 'translateX(0)' : 'translateX(-30px)',
                pointerEvents: phase === 0 ? 'auto' : 'none',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-3 font-mono" style={{ color: '#6b7280' }}>Overview</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {STAT_CARDS.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg p-2.5"
                    style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderLeft: `2px solid ${card.color}` }}
                  >
                    <p className="text-[9px] mb-0.5" style={{ color: '#6b7280' }}>{card.label}</p>
                    <p className="text-lg font-black" style={{ color: card.color }}>
                      {countUpValue(card.value)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-wider mb-2 font-mono" style={{ color: '#6b7280' }}>Recent Content</p>
              <div className="space-y-1">
                {CONTENT_ROWS.map((row, i) => (
                  <div
                    key={row.title}
                    className="flex items-center gap-2 py-1.5 px-2 rounded text-[11px] transition-all duration-500"
                    style={{
                      background: 'rgba(255,255,255,.02)',
                      opacity: phaseProgress > (i * 0.2 + 0.3) ? 1 : 0,
                      transform: phaseProgress > (i * 0.2 + 0.3) ? 'translateX(0)' : 'translateX(-15px)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: row.color }} />
                    <span className="truncate flex-1" style={{ color: 'rgba(255,255,255,.7)' }}>{row.title}</span>
                    <div className="w-14 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${phaseProgress > (i * 0.2 + 0.4) ? row.score : 0}%`, background: row.color }}
                      />
                    </div>
                    <span className="text-[10px] w-5 text-right font-mono" style={{ color: '#6b7280' }}>{row.score}</span>
                  </div>
                ))}
              </div>
              {/* Agent dots */}
              <div className="mt-3 flex items-center gap-3">
                {['Content Autopilot', 'SEO Guardian', 'Pipeline Mgr'].map((name) => (
                  <div key={name} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full hero-blink" style={{ background: '#34d399' }} />
                    <span className="text-[9px] font-mono" style={{ color: '#34d399' }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PHASE 1: Content Creation / Editor */}
            <div
              className="absolute inset-4 transition-all duration-500"
              style={{
                opacity: phase === 1 ? 1 : 0,
                transform: phase === 1 ? 'translateX(0)' : phase < 1 ? 'translateX(30px)' : 'translateX(-30px)',
                pointerEvents: phase === 1 ? 'auto' : 'none',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-3 font-mono" style={{ color: '#6b7280' }}>Content Editor</p>
              {/* Title input */}
              <div
                className="rounded-lg px-3 py-2 mb-3"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(59,130,246,.2)' }}
              >
                <p className="text-[9px] mb-1" style={{ color: '#6b7280' }}>Title</p>
                <p className="text-sm font-semibold text-white">
                  {TYPING_TITLE.slice(0, typedChars)}
                  {typedChars < TYPING_TITLE.length && <span className="hero-typing-cursor" style={{ color: '#3b82f6' }}>|</span>}
                </p>
              </div>
              {/* Editor body placeholder lines */}
              <div className="rounded-lg px-3 py-2 mb-3 space-y-1.5" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                {[100, 85, 92, 60].map((w, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${phase === 1 && phaseProgress > (i * 0.15 + 0.3) ? w : 0}%`,
                      background: 'rgba(255,255,255,.06)',
                    }}
                  />
                ))}
              </div>
              {/* Score meters */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono" style={{ color: '#6b7280' }}>AI Score</span>
                    <span className="text-sm font-black" style={{ color: '#60a5fa' }}>{aiScoreValue}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${aiScoreValue}%`, background: '#3b82f6' }} />
                  </div>
                </div>
                <div className="flex-1 rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono" style={{ color: '#6b7280' }}>SEO Score</span>
                    <span className="text-sm font-black" style={{ color: '#34d399' }}>{Math.round(seoBarWidth)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${seoBarWidth}%`, background: '#34d399' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* PHASE 2: Agent Working */}
            <div
              className="absolute inset-4 transition-all duration-500"
              style={{
                opacity: phase === 2 ? 1 : 0,
                transform: phase === 2 ? 'translateX(0)' : phase < 2 ? 'translateX(30px)' : 'translateX(-30px)',
                pointerEvents: phase === 2 ? 'auto' : 'none',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-3 font-mono" style={{ color: '#6b7280' }}>Agent Panel</p>
              {/* SEO Guardian card */}
              <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(59,130,246,.2)' }}>{'\uD83D\uDEE1'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">SEO Guardian</p>
                    <p className="text-[9px] font-mono transition-all duration-300" style={{ color: phaseProgress > 0.2 ? '#fbbf24' : '#34d399' }}>
                      {phaseProgress > 0.2 ? 'Running\u2026 analyzing meta tags' : 'Idle'}
                    </p>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{ background: phaseProgress > 0.2 ? '#fbbf24' : '#34d399' }}
                  />
                </div>
                {/* Fix log */}
                {phaseProgress > 0.35 && (
                  <div className="rounded px-2 py-1.5 text-[10px] font-mono" style={{ background: 'rgba(0,0,0,.3)', color: '#34d399' }}>
                    {'\u2713'} Fixed: meta description updated for &quot;Best Credit Cards 2026&quot;
                  </div>
                )}
              </div>
              {/* Other agents */}
              {[
                { name: 'Content Autopilot', icon: '\uD83D\uDE80', status: 'Generating 3 articles\u2026', active: true },
                { name: 'Pipeline Manager', icon: '\uD83D\uDCCB', status: 'All pipelines healthy', active: false },
              ].map((agent) => (
                <div key={agent.name} className="rounded-lg p-2.5 mb-2" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{agent.icon}</span>
                    <span className="text-[11px] text-white flex-1">{agent.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: agent.active ? '#fbbf24' : '#6b7280' }}>{agent.status}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'hero-blink' : ''}`} style={{ background: agent.active ? '#fbbf24' : '#6b7280' }} />
                  </div>
                </div>
              ))}

              {/* Toast notification */}
              {toastVisible && (
                <div
                  className="absolute bottom-3 right-3 hero-toast-in rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)' }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ background: '#22c55e', color: '#fff' }}>{'\u2713'}</span>
                  <div>
                    <p className="text-[10px] font-semibold text-white">SEO score improved</p>
                    <p className="text-[9px] font-mono" style={{ color: '#34d399' }}>72 {'\u2192'} 87</p>
                  </div>
                </div>
              )}
            </div>

            {/* PHASE 3: Publishing */}
            <div
              className="absolute inset-4 transition-all duration-500"
              style={{
                opacity: phase === 3 ? 1 : 0,
                transform: phase === 3 ? 'translateX(0)' : phase < 3 ? 'translateX(30px)' : 'translateX(-30px)',
                pointerEvents: phase === 3 ? 'auto' : 'none',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-3 font-mono" style={{ color: '#6b7280' }}>Publish</p>
              {/* Article card */}
              <div
                className="rounded-lg p-3 mb-3 transition-all duration-500"
                style={{
                  background: publishFlash ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${publishFlash ? 'rgba(34,197,94,.4)' : 'rgba(255,255,255,.06)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white">10 Best Investment Strategies for 2026</p>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full transition-all duration-500 ${isPublished ? 'hero-pulse-green' : ''}`}
                    style={{
                      background: isPublished ? 'rgba(34,197,94,.2)' : 'rgba(251,191,36,.2)',
                      color: isPublished ? '#34d399' : '#fbbf24',
                      border: `1px solid ${isPublished ? 'rgba(34,197,94,.3)' : 'rgba(251,191,36,.3)'}`,
                    }}
                  >
                    {isPublished ? '\u2713 Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex gap-4 text-[9px] font-mono" style={{ color: '#6b7280' }}>
                  <span>AI Score: 87</span>
                  <span>SEO: 91</span>
                  <span>Words: 2,847</span>
                </div>
              </div>

              {/* Social distribution panel */}
              <div
                className="rounded-lg p-3 transition-all duration-500"
                style={{
                  opacity: showSocial ? 1 : 0,
                  transform: showSocial ? 'translateY(0)' : 'translateY(10px)',
                  background: 'rgba(255,255,255,.02)',
                  border: '1px solid rgba(255,255,255,.04)',
                }}
              >
                <p className="text-[9px] uppercase tracking-wider mb-2 font-mono" style={{ color: '#6b7280' }}>Auto-distribute</p>
                <div className="space-y-1.5">
                  {[
                    { platform: 'Twitter/X', icon: '\uD835\uDD4F', color: '#1d9bf0' },
                    { platform: 'LinkedIn', icon: 'in', color: '#0a66c2' },
                    { platform: 'Newsletter', icon: '\u2709', color: '#a78bfa' },
                  ].map((s, i) => (
                    <div
                      key={s.platform}
                      className="flex items-center gap-2 py-1 px-2 rounded text-[10px] transition-all duration-500"
                      style={{
                        background: 'rgba(255,255,255,.02)',
                        opacity: showSocial && phaseProgress > (0.5 + i * 0.1) ? 1 : 0,
                        transform: showSocial && phaseProgress > (0.5 + i * 0.1) ? 'translateX(0)' : 'translateX(15px)',
                      }}
                    >
                      <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: s.color }}>{s.icon}</span>
                      <span style={{ color: 'rgba(255,255,255,.7)' }}>{s.platform}</span>
                      <span className="ml-auto text-[9px] font-mono" style={{ color: '#34d399' }}>{'\u2713'} Queued</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confetti particles */}
              {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[
                    { left: '20%', top: '25%', color: '#3b82f6', anim: 'hero-confetti-1', delay: '0s' },
                    { left: '50%', top: '20%', color: '#34d399', anim: 'hero-confetti-2', delay: '0.1s' },
                    { left: '75%', top: '30%', color: '#fbbf24', anim: 'hero-confetti-3', delay: '0.2s' },
                    { left: '35%', top: '18%', color: '#a78bfa', anim: 'hero-confetti-1', delay: '0.15s' },
                    { left: '65%', top: '22%', color: '#f472b6', anim: 'hero-confetti-2', delay: '0.05s' },
                    { left: '45%', top: '28%', color: '#22d3ee', anim: 'hero-confetti-3', delay: '0.25s' },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-sm"
                      style={{
                        left: c.left,
                        top: c.top,
                        background: c.color,
                        animation: `${c.anim} 1s ease-out ${c.delay} both`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* PHASE 4: Analytics */}
            <div
              className="absolute inset-4 transition-all duration-500"
              style={{
                opacity: phase === 4 ? 1 : 0,
                transform: phase === 4 ? 'translateX(0)' : 'translateX(30px)',
                pointerEvents: phase === 4 ? 'auto' : 'none',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-3 font-mono" style={{ color: '#6b7280' }}>Analytics</p>
              {/* Stat row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Impressions', value: 12847, color: '#60a5fa' },
                  { label: 'Clicks', value: 1293, color: '#34d399' },
                  { label: 'Avg Position', value: 8.4, color: '#fbbf24' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg p-2"
                    style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}
                  >
                    <p className="text-[9px] mb-0.5" style={{ color: '#6b7280' }}>{stat.label}</p>
                    <p className="text-sm font-black" style={{ color: stat.color }}>
                      {typeof stat.value === 'number' && stat.value > 100
                        ? Math.round(stat.value * Math.min(analyticsProgress * 2, 1)).toLocaleString()
                        : stat.value > 1
                          ? (stat.value * Math.min(analyticsProgress * 2, 1)).toFixed(1)
                          : stat.value}
                    </p>
                  </div>
                ))}
              </div>
              {/* Mini chart */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                <p className="text-[9px] uppercase tracking-wider mb-2 font-mono" style={{ color: '#6b7280' }}>Traffic (7 days)</p>
                <svg viewBox="0 0 300 80" className="w-full" style={{ height: 80 }}>
                  {/* Grid lines */}
                  {[0, 20, 40, 60].map((y) => (
                    <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,.04)" strokeWidth="0.5" />
                  ))}
                  {/* Area fill */}
                  <defs>
                    <linearGradient id="hero-chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {analyticsProgress > 0.1 && (
                    <>
                      <path
                        d={buildAreaPath(ANALYTICS_POINTS, 300, 70, analyticsProgress)}
                        fill="url(#hero-chart-grad)"
                      />
                      <path
                        d={buildLinePath(ANALYTICS_POINTS, 300, 70, analyticsProgress)}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Dot at end */}
                      {analyticsProgress > 0.5 && (() => {
                        const visibleCount = Math.ceil(ANALYTICS_POINTS.length * Math.min(analyticsProgress * 1.5, 1));
                        const lastIdx = Math.min(visibleCount - 1, ANALYTICS_POINTS.length - 1);
                        const maxVal = Math.max(...ANALYTICS_POINTS);
                        const x = (lastIdx / (ANALYTICS_POINTS.length - 1)) * 300;
                        const y = 70 - (ANALYTICS_POINTS[lastIdx] / maxVal) * 65;
                        return (
                          <circle cx={x} cy={y} r="3" fill="#3b82f6" stroke="#0f1021" strokeWidth="1.5">
                            <animate attributeName="r" values="3;4.5;3" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                        );
                      })()}
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div style={{ height: 2, background: '#13142a' }}>
          <div
            className="h-full transition-none"
            style={{
              width: `${((phase * PHASE_DURATION + phaseProgress * PHASE_DURATION) / CYCLE) * 100}%`,
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SVG chart helpers                                                  */
/* ------------------------------------------------------------------ */

function buildLinePath(points: number[], width: number, height: number, progress: number): string {
  const maxVal = Math.max(...points);
  const visibleCount = Math.ceil(points.length * Math.min(progress * 1.5, 1));
  const visible = points.slice(0, visibleCount);
  if (visible.length < 2) return '';
  return visible.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - (val / maxVal) * (height - 5);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
}

function buildAreaPath(points: number[], width: number, height: number, progress: number): string {
  const line = buildLinePath(points, width, height, progress);
  if (!line) return '';
  const maxVal = Math.max(...points);
  const visibleCount = Math.ceil(points.length * Math.min(progress * 1.5, 1));
  const lastX = ((visibleCount - 1) / (points.length - 1)) * width;
  return `${line} L${lastX},${height} L0,${height} Z`;
}
