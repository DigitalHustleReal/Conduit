'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  review: 'outline',
  published: 'default',
  scheduled: 'secondary',
  archived: 'destructive',
};

type SortKey = 'updated' | 'title' | 'seoScore' | 'aiScore';

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
}

export default function ContentPage() {
  const { content, collections } = useWorkspace();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let items = [...content];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((c) => c.title.toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') items = items.filter((c) => c.status === statusFilter);
    if (collectionFilter !== 'all') items = items.filter((c) => c.collection === collectionFilter);
    items.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return items;
  }, [content, search, statusFilter, collectionFilter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('desc'); }
  };

  const uniqueCollections = useMemo(() => [...new Set(content.map((c) => c.collection).filter(Boolean))], [content]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Content Management</p>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-muted-foreground mt-1">All your articles across every collection.</p>
        </div>
        <Link href="/editor/new"><Button>+ New Article</Button></Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        <select className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" value={collectionFilter} onChange={(e) => setCollectionFilter(e.target.value)}>
          <option value="all">All collections</option>
          {uniqueCollections.map((c) => <option key={c} value={c}>{c}</option>)}
          {collections.map((c) => !uniqueCollections.includes(c.name) ? <option key={c.id} value={c.name}>{c.name}</option> : null)}
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No articles yet.</p>
              <p className="text-sm mb-4">Create your first one.</p>
              <Link href="/editor/new"><Button variant="outline">+ New Article</Button></Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 cursor-pointer" onClick={() => toggleSort('title')}>Title {sortBy === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="pb-2 pr-4">Collection</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4 cursor-pointer" onClick={() => toggleSort('seoScore')}>SEO {sortBy === 'seoScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="pb-2 pr-4 cursor-pointer" onClick={() => toggleSort('aiScore')}>AI {sortBy === 'aiScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="pb-2 pr-4">Words</th>
                    <th className="pb-2 cursor-pointer" onClick={() => toggleSort('updated')}>Updated {sortBy === 'updated' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2 pr-4">
                        <Link href={`/editor/new?id=${item.id}`} className="font-medium text-foreground hover:underline">{item.title || 'Untitled'}</Link>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{item.collection || '-'}</td>
                      <td className="py-2 pr-4"><Badge variant={STATUS_COLORS[item.status] || 'secondary'}>{item.status}</Badge></td>
                      <td className={`py-2 pr-4 font-mono ${scoreColor(item.seoScore)}`}>{item.seoScore}</td>
                      <td className={`py-2 pr-4 font-mono ${scoreColor(item.aiScore)}`}>{item.aiScore}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{item.wordCount.toLocaleString()}</td>
                      <td className="py-2 text-muted-foreground">{new Date(item.updated).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
