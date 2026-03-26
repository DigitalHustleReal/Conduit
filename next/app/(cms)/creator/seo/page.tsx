'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface SEOCheck {
  label: string;
  pass: boolean;
  tip: string;
}

export default function VideoSEOPage() {
  const { deductCredit } = useWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [generatingTags, setGeneratingTags] = useState(false);

  const checks = useMemo<SEOCheck[]>(() => {
    const c: SEOCheck[] = [];
    c.push({ label: 'Title length (40-70 chars)', pass: title.length >= 40 && title.length <= 70, tip: title.length < 40 ? 'Title is too short. Aim for 40-70 characters.' : title.length > 70 ? 'Title is too long. Keep it under 70 characters.' : 'Title length is optimal.' });
    c.push({ label: 'Title has keyword', pass: title.trim().length > 0 && title.split(/\s+/).length >= 3, tip: 'Include your main keyword naturally in the title.' });
    c.push({ label: 'Title uses numbers', pass: /\d/.test(title), tip: 'Titles with numbers (e.g. "7 Tips") get 36% more clicks.' });
    c.push({ label: 'Description length (200+ chars)', pass: description.length >= 200, tip: `Description is ${description.length} chars. Aim for 200+ for better discovery.` });
    c.push({ label: 'Description has links', pass: /https?:\/\//.test(description), tip: 'Add relevant links to your website, social media, or related videos.' });
    c.push({ label: 'Tags count (5+)', pass: tags.split(',').filter((t) => t.trim()).length >= 5, tip: 'Use at least 5 relevant tags. Mix broad and specific terms.' });
    c.push({ label: 'Has hashtags in description', pass: /#\w+/.test(description), tip: 'Add 3-5 hashtags at the end of your description for discovery.' });
    return c;
  }, [title, description, tags]);

  const score = checks.length ? Math.round((checks.filter((c) => c.pass).length / checks.length) * 100) : 0;

  function handleGenerateTags() {
    if (!title.trim()) return;
    if (!deductCredit('aiCalls')) return;

    setGeneratingTags(true);
    setTimeout(() => {
      const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const generated = [
        ...words.slice(0, 3),
        `${words[0] || 'content'} tutorial`,
        `${words[0] || 'content'} tips`,
        `how to ${words[0] || 'start'}`,
        `${words[0] || 'content'} 2026`,
        `best ${words[0] || 'content'}`,
        `${words[0] || 'content'} for beginners`,
        `${words[0] || 'content'} strategy`,
      ];
      setGeneratedTags(generated);
      setGeneratingTags(false);
    }, 1000);
  }

  function addGeneratedTags() {
    const existing = tags ? tags + ', ' : '';
    setTags(existing + generatedTags.join(', '));
    setGeneratedTags([]);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Creator / SEO</p>
        <h1 className="text-2xl font-bold">Video SEO</h1>
        <p className="text-sm text-muted-foreground mt-1">Optimize your video metadata for maximum discoverability.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Form */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Video Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Title</label>
                  <span className="text-xs text-muted-foreground">{title.length} chars</span>
                </div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your video title" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Description</label>
                  <span className="text-xs text-muted-foreground">{description.length} chars</span>
                </div>
                <textarea
                  className="w-full bg-background border rounded-md px-3 py-2 text-sm min-h-[120px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a detailed video description with keywords, links, and hashtags..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
                <textarea
                  className="w-full bg-background border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="seo, video seo, youtube tips, ..."
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleGenerateTags} disabled={generatingTags || !title.trim()}>
                  {generatingTags ? 'Generating...' : 'AI Generate Tags'}
                </Button>
              </div>
              {generatedTags.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {generatedTags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                  <Button size="sm" onClick={addGeneratedTags}>Add All Tags</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">SEO Score</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold" style={{ color: score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171' }}>
                  {score}
                </div>
                <div className="text-xs text-muted-foreground">out of 100</div>
              </div>
              <Progress value={score} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Optimization Checks</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{c.pass ? '✅' : '❌'}</span>
                    <div>
                      <div className="text-xs font-medium">{c.label}</div>
                      {!c.pass && <div className="text-xs text-muted-foreground">{c.tip}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
