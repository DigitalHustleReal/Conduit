'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const TONES = ['Professional', 'Casual', 'Educational', 'Entertaining', 'Inspirational', 'Conversational'];

export default function ScriptPage() {
  const { deductCredit, addContent } = useWorkspace();

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [targetLength, setTargetLength] = useState('10');
  const [tone, setTone] = useState('Educational');
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<{ hook: string; intro: string; mainPoints: string[]; cta: string; outro: string } | null>(null);

  function handleGenerate() {
    if (!title.trim() || !topic.trim()) return;
    if (!deductCredit('aiCalls')) {
      alert('No AI credits remaining. Upgrade your plan or add an API key.');
      return;
    }

    setGenerating(true);
    setTimeout(() => {
      setScript({
        hook: `What if I told you that ${topic} could completely change the way you think about ${title.toLowerCase()}? Stay with me, because what I'm about to share has never been explained like this before.`,
        intro: `Hey everyone, welcome back to the channel. Today we're diving deep into ${topic}. Whether you're a beginner or already experienced, this video will give you actionable insights you can use right away. Let's jump right in.`,
        mainPoints: [
          `Point 1: The Foundation — Let's start with the basics of ${topic}. Most people get this wrong, and that's why they struggle. Here's the key insight that separates beginners from experts...`,
          `Point 2: The Strategy — Now that you understand the fundamentals, here's the proven strategy that top performers use. I've tested this across dozens of scenarios and the results speak for themselves...`,
          `Point 3: Advanced Techniques — This is where it gets really interesting. Once you master the basics, these advanced techniques will 10x your results. Pay close attention to this section...`,
          `Point 4: Common Mistakes — Before we wrap up, let me save you time by covering the top mistakes people make with ${topic}. I made every single one of these when I started...`,
        ],
        cta: `If you found this valuable, smash that like button and subscribe for more content on ${topic}. Drop a comment below telling me which tip was most helpful — I read every single one.`,
        outro: `Thanks for watching all the way through. Remember, knowledge without action is useless, so pick one thing from today's video and implement it right now. I'll see you in the next one.`,
      });
      setGenerating(false);
    }, 1500);
  }

  function handleCopy() {
    if (!script) return;
    const text = [
      `HOOK:\n${script.hook}`,
      `\nINTRO:\n${script.intro}`,
      `\nMAIN CONTENT:\n${script.mainPoints.join('\n\n')}`,
      `\nCALL TO ACTION:\n${script.cta}`,
      `\nOUTRO:\n${script.outro}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
  }

  function handleSave() {
    if (!script) return;
    const body = [script.hook, script.intro, ...script.mainPoints, script.cta, script.outro].join('\n\n');
    addContent({
      id: Date.now(),
      title: `[Script] ${title}`,
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Creator / Scripts</p>
        <h1 className="text-2xl font-bold">YouTube Script Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate structured video scripts with AI.</p>
      </div>

      {/* Form */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Script Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Video Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 10 SEO Tips for Beginners" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic / Description</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is this video about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Length (minutes)</label>
              <select className="w-full bg-background border rounded-md px-3 py-1.5 text-sm" value={targetLength} onChange={(e) => setTargetLength(e.target.value)}>
                {['5', '8', '10', '15', '20', '30'].map((l) => <option key={l} value={l}>{l} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
              <select className="w-full bg-background border rounded-md px-3 py-1.5 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !title.trim() || !topic.trim()} className="w-full">
            {generating ? 'Generating Script...' : 'Generate Script'}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      {script && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Generated Script</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy}>Copy</Button>
              <Button size="sm" onClick={handleSave}>Save to Content</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Hook', text: script.hook },
              { label: 'Intro', text: script.intro },
            ].map((s) => (
              <div key={s.label}>
                <Badge className="mb-1">{s.label}</Badge>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{s.text}</p>
              </div>
            ))}
            <div>
              <Badge className="mb-1">Main Content</Badge>
              {script.mainPoints.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{p}</p>
              ))}
            </div>
            {[
              { label: 'Call to Action', text: script.cta },
              { label: 'Outro', text: script.outro },
            ].map((s) => (
              <div key={s.label}>
                <Badge className="mb-1">{s.label}</Badge>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{s.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
