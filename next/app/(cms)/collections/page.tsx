'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Collection } from '@/types/content';

const DEFAULT_COLLECTIONS: Omit<Collection, 'id'>[] = [
  { name: 'Articles', slug: 'articles', icon: '📄', description: 'Blog posts and long-form articles', fields: [{ n: 'title', t: 'text', req: true }, { n: 'body', t: 'richtext', req: true }, { n: 'excerpt', t: 'textarea' }] },
  { name: 'Products', slug: 'products', icon: '📦', description: 'Product pages and reviews', fields: [{ n: 'title', t: 'text', req: true }, { n: 'price', t: 'number' }, { n: 'description', t: 'richtext' }] },
  { name: 'Pages', slug: 'pages', icon: '📃', description: 'Static site pages', fields: [{ n: 'title', t: 'text', req: true }, { n: 'body', t: 'richtext', req: true }] },
  { name: 'Glossary', slug: 'glossary', icon: '📖', description: 'Term definitions and explanations', fields: [{ n: 'term', t: 'text', req: true }, { n: 'definition', t: 'textarea', req: true }] },
  { name: 'FAQs', slug: 'faqs', icon: '❓', description: 'Frequently asked questions', fields: [{ n: 'question', t: 'text', req: true }, { n: 'answer', t: 'richtext', req: true }] },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function CollectionsPage() {
  const { collections, content, setSettings, settings } = useWorkspace();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newIcon, setNewIcon] = useState('📁');
  const [newDesc, setNewDesc] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const displayCollections = useMemo(() => {
    if (collections.length > 0) return collections;
    return DEFAULT_COLLECTIONS.map((c, i) => ({ ...c, id: -(i + 1) }));
  }, [collections]);

  function articleCount(name: string) {
    return content.filter((c) => c.collection === name).length;
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const col: Collection = {
      id: Date.now(), name: newName.trim(), slug: newSlug || slugify(newName),
      icon: newIcon, description: newDesc, fields: [{ n: 'title', t: 'text', req: true }, { n: 'body', t: 'richtext', req: true }],
    };
    const updated = [...collections, col];
    // We store collections via workspace — but since the store only has setSettings/setContent etc, we push to contentTypes
    const types = [...new Set([...settings.contentTypes, col.name])];
    setSettings({ contentTypes: types });
    setShowForm(false);
    setNewName(''); setNewSlug(''); setNewIcon('📁'); setNewDesc('');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Content Management</p>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage content types and field schemas.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Collection'}</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">New Collection</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input placeholder="Collection name" value={newName} onChange={(e) => { setNewName(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Slug</label>
                <Input placeholder="collection-slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Icon (emoji)</label>
                <Input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className="w-20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Input placeholder="What this collection is for" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate}>Create Collection</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayCollections.map((col) => (
          <Card key={col.id} className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setExpanded(expanded === col.id ? null : col.id)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{col.icon}</span>
                <div>
                  <CardTitle className="text-sm">{col.name}</CardTitle>
                  <CardDescription>{col.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                <span>{col.fields.length} field{col.fields.length !== 1 ? 's' : ''}</span>
                <span>{articleCount(col.name)} article{articleCount(col.name) !== 1 ? 's' : ''}</span>
              </div>
              {expanded === col.id && (
                <div className="mt-2 border-t pt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fields:</p>
                  {col.fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{f.t}</Badge>
                      <span>{f.n}</span>
                      {f.req && <span className="text-red-500">*</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
