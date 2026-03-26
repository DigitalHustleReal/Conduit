'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function NewContentPage() {
  return <Suspense fallback={<div className="p-6 text-muted-foreground">Loading editor...</div>}><EditorInner /></Suspense>;
}

function EditorInner() {
  const params = useSearchParams();
  const editId = params.get('id') ? Number(params.get('id')) : null;
  const { content, collections, settings, addContent, updateContentItem } = useWorkspace();

  const existing = useMemo(() => (editId ? content.find((c) => c.id === editId) : null), [editId, content]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [collection, setCollection] = useState('');
  const [keyword, setKeyword] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'review' | 'published' | 'scheduled'>('draft');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug || '');
      setBody(existing.content || existing.body || '');
      setCollection(existing.collection || '');
      setKeyword(existing.keyword || '');
      setTags((existing.tags || []).join(', '));
      setStatus(existing.status === 'archived' ? 'draft' : existing.status);
      setMetaTitle(existing.metaTitle || existing.seoTitle || '');
      setMetaDesc(existing.metaDescription || existing.metaDesc || '');
      setSlugEdited(true);
    }
  }, [existing]);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);
  const seoScore = useMemo(() => {
    let score = 0;
    if (title.length > 10) score += 20;
    if (metaTitle.length > 10) score += 20;
    if (metaDesc.length > 50) score += 20;
    if (keyword && title.toLowerCase().includes(keyword.toLowerCase())) score += 20;
    if (wordCount > 300) score += 20;
    return score;
  }, [title, metaTitle, metaDesc, keyword, wordCount]);

  const aiScore = existing?.aiScore || 0;

  function handleSave() {
    const now = Date.now();
    if (existing) {
      updateContentItem(existing.id, {
        title, slug, content: body, collection, keyword,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        status, metaTitle, metaDescription: metaDesc, wordCount, seoScore,
      });
    } else {
      addContent({
        id: now, title, slug, content: body, collection, keyword,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        status, metaTitle, metaDescription: metaDesc, wordCount,
        aiScore: 0, seoScore, created: now, updated: now,
      });
    }
  }

  const allCollections = useMemo(() => {
    const names = collections.map((c) => c.name);
    for (const ct of settings.contentTypes) {
      if (!names.includes(ct)) names.push(ct);
    }
    return names;
  }, [collections, settings.contentTypes]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Content Management</p>
          <h1 className="text-2xl font-bold">{existing ? 'Edit Article' : 'New Article'}</h1>
        </div>
        <Link href="/editor" className="text-sm text-muted-foreground hover:underline">Back to Content</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Input placeholder="Article title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg h-10 font-semibold" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Slug:</span>
            <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} className="h-7 text-xs font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Collection</label>
              <select className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" value={collection} onChange={(e) => setCollection(e.target.value)}>
                <option value="">Select collection</option>
                {allCollections.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Keyword</label>
              <Input placeholder="Target keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tags (comma separated)</label>
            <Input placeholder="seo, content, marketing" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Content Body</label>
            <textarea
              className="w-full min-h-[400px] rounded-lg border border-input bg-transparent p-3 text-sm focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none resize-y"
              placeholder="Write your article content here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Publish</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <Button className="w-full" onClick={handleSave}>{existing ? 'Update Article' : 'Save Article'}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Scores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">SEO Score</span>
                <Badge variant={seoScore >= 60 ? 'default' : 'destructive'}>{seoScore}/100</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${seoScore}%`, backgroundColor: seoScore >= 80 ? '#22c55e' : seoScore >= 60 ? '#eab308' : '#ef4444' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">AI Score</span>
                <Badge variant="secondary">{aiScore}/100</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Word Count</span>
                <span className="font-mono text-sm">{wordCount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">SEO Meta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meta Title</label>
                <Input placeholder="SEO title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                <span className="text-xs text-muted-foreground">{metaTitle.length}/60</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meta Description</label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 resize-y"
                  placeholder="SEO description"
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">{metaDesc.length}/160</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
