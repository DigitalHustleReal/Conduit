'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const STYLES = ['bold', 'minimal', 'gradient', 'dark', 'neon', 'retro'] as const;
const TEMPLATES = [
  { name: 'Bold Impact', style: 'bold', bg: 'bg-gradient-to-br from-red-600 to-orange-500', text: 'text-white font-black text-xl' },
  { name: 'Clean Minimal', style: 'minimal', bg: 'bg-white', text: 'text-zinc-900 font-semibold text-lg' },
  { name: 'Ocean Gradient', style: 'gradient', bg: 'bg-gradient-to-br from-cyan-500 to-blue-700', text: 'text-white font-bold text-lg' },
  { name: 'Dark Pro', style: 'dark', bg: 'bg-zinc-900 border border-zinc-700', text: 'text-zinc-100 font-bold text-lg' },
  { name: 'Neon Glow', style: 'neon', bg: 'bg-black', text: 'text-emerald-400 font-black text-xl' },
  { name: 'Retro Wave', style: 'retro', bg: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', text: 'text-white font-black text-xl' },
];

export default function ThumbnailsPage() {
  const { deductCredit } = useWorkspace();
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<typeof STYLES[number]>('bold');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [generated, setGenerated] = useState(false);

  function handleGenerate() {
    if (!title.trim()) return;
    const ok = deductCredit('aiCalls');
    if (!ok) return;
    setGenerated(true);
  }

  const activeTemplate = TEMPLATES.find((t) => t.style === style) || TEMPLATES[0];

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Visual Studio</p>
        <h1 className="text-2xl font-bold">Thumbnail Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <Link href="/visuals" className="text-violet-400 hover:underline">Visual Studio</Link> / Thumbnails
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title Text</label>
                <Input placeholder="10 Tips for Better SEO..." value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-28 font-mono text-xs" />
                </div>
              </div>
              <Button onClick={handleGenerate} className="w-full" disabled={!title.trim()}>Generate Thumbnail</Button>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
            <CardContent>
              <div className={`aspect-video rounded-lg flex items-center justify-center p-6 ${activeTemplate.bg}`}>
                <p className={`text-center leading-tight ${activeTemplate.text}`}>
                  {title || 'Your Title Here'}
                </p>
              </div>
              {generated && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1">Download PNG</Button>
                  <Button size="sm" variant="outline" className="flex-1">Download JPG</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Template Grid */}
        <Card className="bg-card">
          <CardHeader><CardTitle className="text-sm">Templates</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setStyle(t.style as typeof STYLES[number])}
                  className={`text-left rounded-lg overflow-hidden border transition-all ${style === t.style ? 'ring-2 ring-violet-500 border-violet-500' : 'border-border hover:border-muted-foreground/50'}`}
                >
                  <div className={`aspect-video flex items-center justify-center p-3 ${t.bg}`}>
                    <p className={`text-center leading-tight text-xs ${t.text}`}>
                      {title || 'Sample Title'}
                    </p>
                  </div>
                  <div className="p-2 bg-card">
                    <p className="text-xs font-medium">{t.name}</p>
                    <Badge variant="secondary" className="text-[9px] mt-0.5">{t.style}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
