'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const DIMENSIONS = [
  { label: 'OG Image', w: 1200, h: 630, desc: 'Social sharing (Facebook, LinkedIn)' },
  { label: 'Blog Hero', w: 1200, h: 900, desc: 'Blog post featured image' },
  { label: 'Twitter Card', w: 1200, h: 675, desc: 'Twitter/X large card' },
  { label: 'Custom', w: 0, h: 0, desc: 'Set your own dimensions' },
];

const STYLES = ['professional', 'vibrant', 'dark', 'minimal', 'abstract'] as const;

const STYLE_CLASSES: Record<string, { bg: string; text: string }> = {
  professional: { bg: 'bg-gradient-to-br from-slate-700 to-slate-900', text: 'text-white' },
  vibrant: { bg: 'bg-gradient-to-br from-violet-500 to-pink-500', text: 'text-white' },
  dark: { bg: 'bg-zinc-950 border border-zinc-800', text: 'text-zinc-100' },
  minimal: { bg: 'bg-zinc-100', text: 'text-zinc-900' },
  abstract: { bg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600', text: 'text-white' },
};

export default function FeaturedImagesPage() {
  const { content, deductCredit } = useWorkspace();
  const [articleTitle, setArticleTitle] = useState('');
  const [style, setStyle] = useState<typeof STYLES[number]>('professional');
  const [dimIdx, setDimIdx] = useState(0);
  const [customW, setCustomW] = useState('1200');
  const [customH, setCustomH] = useState('630');
  const [generated, setGenerated] = useState(false);

  const dim = DIMENSIONS[dimIdx];
  const width = dim.w || parseInt(customW) || 1200;
  const height = dim.h || parseInt(customH) || 630;
  const ratio = width / height;
  const sc = STYLE_CLASSES[style];

  function handleGenerate() {
    if (!articleTitle.trim()) return;
    deductCredit('aiCalls');
    setGenerated(true);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Visual Studio</p>
        <h1 className="text-2xl font-bold">Featured Image Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <Link href="/visuals" className="text-violet-400 hover:underline">Visual Studio</Link> / Featured Images
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Image Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Article Title</label>
                <Input placeholder="How AI is Changing Content Marketing..." value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} />
                {content.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Or pick from existing:</p>
                    <div className="flex flex-wrap gap-1">
                      {content.slice(0, 5).map((c) => (
                        <button key={c.id} onClick={() => setArticleTitle(c.title)}
                          className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 truncate max-w-[180px]">
                          {c.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Dimensions</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIMENSIONS.map((d, i) => (
                    <button key={d.label} onClick={() => setDimIdx(i)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all ${dimIdx === i ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-muted-foreground/50'}`}>
                      <div className="font-medium">{d.label}</div>
                      <div className="text-muted-foreground text-[10px]">{d.w ? `${d.w}x${d.h}` : 'Custom'} &middot; {d.desc}</div>
                    </button>
                  ))}
                </div>
                {dimIdx === 3 && (
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Width" value={customW} onChange={(e) => setCustomW(e.target.value)} className="w-24" />
                    <span className="text-muted-foreground self-center">x</span>
                    <Input placeholder="Height" value={customH} onChange={(e) => setCustomH(e.target.value)} className="w-24" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <Button key={s} size="sm" variant={style === s ? 'default' : 'outline'} onClick={() => setStyle(s)} className="capitalize">
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleGenerate} className="w-full" disabled={!articleTitle.trim()}>Generate Featured Image</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Preview</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{width}x{height}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg flex flex-col items-center justify-center p-8 ${sc.bg}`}
                 style={{ aspectRatio: ratio }}>
              <p className={`text-center font-bold text-lg leading-tight mb-2 ${sc.text}`}>
                {articleTitle || 'Article Title Preview'}
              </p>
              <p className={`text-xs opacity-60 ${sc.text}`}>conduit.pub</p>
            </div>
            {generated && (
              <div className="space-y-2 mt-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">Download PNG</Button>
                  <Button size="sm" variant="outline" className="flex-1">Download WebP</Button>
                </div>
                <Button size="sm" variant="outline" className="w-full">Set as Article Featured Image</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
