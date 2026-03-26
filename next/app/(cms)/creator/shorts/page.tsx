'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const HOOK_STYLES = ['Question', 'Bold Claim', 'Story', 'Statistic', 'Controversial Take', 'Tutorial Start'];

const VIRAL_TIPS = [
  { tip: 'Hook in the first 1 second', desc: 'Viewers decide to stay or scroll in under a second. Lead with the most compelling part.' },
  { tip: 'Use pattern interrupts', desc: 'Change visuals, angles, or audio every 2-3 seconds to maintain attention.' },
  { tip: 'End with a loop', desc: 'Make the ending lead back to the beginning so viewers watch again, boosting your watch time.' },
  { tip: 'Text on screen always', desc: 'Many viewers watch without sound. Add captions and key text overlays.' },
  { tip: 'One idea per short', desc: 'Focused content performs better than broad content.' },
];

export default function ShortsPage() {
  const { deductCredit, addContent } = useWorkspace();

  const [topic, setTopic] = useState('');
  const [hookStyle, setHookStyle] = useState('Bold Claim');
  const [duration, setDuration] = useState('30');
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<{ hook: string; content: string; cta: string } | null>(null);

  function handleGenerate() {
    if (!topic.trim()) return;
    if (!deductCredit('aiCalls')) {
      alert('No AI credits remaining.');
      return;
    }

    setGenerating(true);
    setTimeout(() => {
      const hooks: Record<string, string> = {
        'Question': `Did you know that most people get ${topic} completely wrong?`,
        'Bold Claim': `This one trick about ${topic} changed everything for me.`,
        'Story': `I spent 3 months testing every ${topic} strategy. Here's what actually works.`,
        'Statistic': `97% of people fail at ${topic}. Here's why you won't.`,
        'Controversial Take': `Everything you've been told about ${topic} is a lie. Here's the truth.`,
        'Tutorial Start': `Here's exactly how to master ${topic} in under 60 seconds.`,
      };

      setScript({
        hook: hooks[hookStyle] || hooks['Bold Claim'],
        content: `Here's the thing about ${topic} — most people overcomplicate it. The secret is actually simple: focus on the fundamentals first. Step one: identify your core goal. Step two: eliminate everything that doesn't directly support it. Step three: execute consistently for 30 days. That's it. No fancy tools, no expensive courses. Just focused action on what actually moves the needle.`,
        cta: `Follow for more ${topic} tips. Save this for later. Drop a comment if you want part 2.`,
      });
      setGenerating(false);
    }, 1000);
  }

  function handleCopy() {
    if (!script) return;
    navigator.clipboard.writeText(`HOOK: ${script.hook}\n\n${script.content}\n\nCTA: ${script.cta}`);
  }

  function handleSave() {
    if (!script) return;
    const body = `${script.hook}\n\n${script.content}\n\n${script.cta}`;
    addContent({
      id: Date.now(),
      title: `[Short] ${topic}`,
      body,
      status: 'draft',
      collection: 'Scripts',
      wordCount: body.split(/\s+/).length,
      seoScore: 0,
      aiScore: 0,
      created: Date.now(),
      updated: Date.now(),
    });
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Creator / Shorts</p>
        <h1 className="text-2xl font-bold">Shorts & Reels Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Create viral short-form video scripts.</p>
      </div>

      {/* Form */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Short Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Building a personal brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hook Style</label>
              <select className="w-full bg-background border rounded-md px-3 py-1.5 text-sm" value={hookStyle} onChange={(e) => setHookStyle(e.target.value)}>
                {HOOK_STYLES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
              <select className="w-full bg-background border rounded-md px-3 py-1.5 text-sm" value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
              </select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !topic.trim()} className="w-full">
            {generating ? 'Generating...' : 'Generate Short Script'}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      {script && (
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Generated Script ({duration}s)</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy}>Copy</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Badge className="mb-1 bg-red-500/20 text-red-400">Hook</Badge>
              <p className="text-sm leading-relaxed">{script.hook}</p>
            </div>
            <div>
              <Badge className="mb-1">Content</Badge>
              <p className="text-sm leading-relaxed">{script.content}</p>
            </div>
            <div>
              <Badge className="mb-1 bg-emerald-500/20 text-emerald-400">CTA</Badge>
              <p className="text-sm leading-relaxed">{script.cta}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Viral Tips */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Tips for Viral Shorts</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {VIRAL_TIPS.map((t, i) => (
              <div key={i} className="flex gap-3 p-2">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">{i + 1}</div>
                <div>
                  <div className="text-sm font-medium">{t.tip}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
