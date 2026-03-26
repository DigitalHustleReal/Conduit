'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const INFOGRAPHIC_STYLES = ['modern', 'corporate', 'playful', 'data-heavy', 'timeline'] as const;

const STYLE_PREVIEW: Record<string, string> = {
  modern: 'bg-gradient-to-b from-zinc-900 to-zinc-800 text-white',
  corporate: 'bg-white text-zinc-900 border border-zinc-200',
  playful: 'bg-gradient-to-b from-amber-100 to-pink-100 text-zinc-900',
  'data-heavy': 'bg-zinc-950 text-emerald-400',
  timeline: 'bg-gradient-to-b from-blue-900 to-indigo-900 text-white',
};

export default function InfographicsPage() {
  const { deductCredit } = useWorkspace();
  const [topic, setTopic] = useState('');
  const [dataPoints, setDataPoints] = useState(['', '', '', '']);
  const [style, setStyle] = useState<typeof INFOGRAPHIC_STYLES[number]>('modern');
  const [generated, setGenerated] = useState(false);

  function updatePoint(idx: number, val: string) {
    const next = [...dataPoints];
    next[idx] = val;
    setDataPoints(next);
  }

  function addPoint() {
    setDataPoints([...dataPoints, '']);
  }

  function removePoint(idx: number) {
    if (dataPoints.length <= 2) return;
    setDataPoints(dataPoints.filter((_, i) => i !== idx));
  }

  function handleGenerate() {
    if (!topic.trim()) return;
    deductCredit('aiCalls');
    setGenerated(true);
  }

  const filledPoints = dataPoints.filter((p) => p.trim());

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Visual Studio</p>
        <h1 className="text-2xl font-bold">Infographic Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <Link href="/visuals" className="text-violet-400 hover:underline">Visual Studio</Link> / Infographics
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Infographic Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic / Title</label>
                <Input placeholder="The State of Content Marketing in 2026" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Points</label>
                <div className="space-y-2">
                  {dataPoints.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder={`Point ${i + 1}: e.g., "73% of marketers use AI"`} value={p} onChange={(e) => updatePoint(i, e.target.value)} />
                      <Button size="sm" variant="ghost" onClick={() => removePoint(i)} disabled={dataPoints.length <= 2} className="text-muted-foreground shrink-0">x</Button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={addPoint} className="mt-2 w-full">+ Add Data Point</Button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Style</label>
                <div className="flex flex-wrap gap-2">
                  {INFOGRAPHIC_STYLES.map((s) => (
                    <Button key={s} size="sm" variant={style === s ? 'default' : 'outline'} onClick={() => setStyle(s)} className="capitalize">
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleGenerate} className="w-full" disabled={!topic.trim() || filledPoints.length < 2}>
                Generate Infographic
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Preview</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{filledPoints.length} data points</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg p-6 min-h-[400px] ${STYLE_PREVIEW[style]}`}>
              <h3 className="font-bold text-lg text-center mb-6">{topic || 'Infographic Title'}</h3>
              <div className="space-y-4">
                {(filledPoints.length > 0 ? filledPoints : ['Data point 1', 'Data point 2']).map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm pt-1">{p}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center text-[10px] opacity-40">conduit.pub</div>
            </div>
            {generated && (
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1">Download PNG</Button>
                <Button size="sm" variant="outline" className="flex-1">Download SVG</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
