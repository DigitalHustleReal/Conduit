'use client';

import { useMemo } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ContentLinksPage() {
  const { content } = useWorkspace();

  const linkData = useMemo(() => {
    const slugs = new Set(content.map((c) => c.slug).filter(Boolean));
    return content.map((item) => {
      const body = item.content || item.body || '';
      // Count outgoing internal links by looking for slugs in the content
      const outgoing = content.filter((other) =>
        other.id !== item.id && other.slug && body.toLowerCase().includes(other.slug.toLowerCase())
      ).length;
      // Count incoming links from other articles that reference this item's slug
      const incoming = content.filter((other) => {
        if (other.id === item.id || !item.slug) return false;
        const otherBody = other.content || other.body || '';
        return otherBody.toLowerCase().includes((item.slug || '').toLowerCase());
      }).length;
      return { ...item, outgoing, incoming, isOrphan: incoming === 0 };
    });
  }, [content]);

  const totalLinks = useMemo(() => linkData.reduce((s, d) => s + d.outgoing, 0), [linkData]);
  const orphanCount = useMemo(() => linkData.filter((d) => d.isOrphan).length, [linkData]);
  const avgLinks = useMemo(() => {
    if (!linkData.length) return 0;
    return (totalLinks / linkData.length).toFixed(1);
  }, [linkData, totalLinks]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">SEO</p>
          <h1 className="text-2xl font-bold">Content Links</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal link network and orphan detection.</p>
        </div>
        <Button variant="outline">Suggest Interlinks</Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Articles</p>
            <p className="text-2xl font-bold">{content.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Internal Links</p>
            <p className="text-2xl font-bold">{totalLinks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Orphaned Articles</p>
            <p className={`text-2xl font-bold ${orphanCount > 0 ? 'text-red-500' : 'text-green-600'}`}>{orphanCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg Links / Article</p>
            <p className="text-2xl font-bold">{avgLinks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Link Map */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Link Map</CardTitle></CardHeader>
        <CardContent>
          {linkData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No content yet. Create articles to see your internal link network.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Article</th>
                  <th className="pb-2 pr-4">Outgoing Links</th>
                  <th className="pb-2 pr-4">Incoming Links</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {linkData.map((item) => (
                  <tr key={item.id} className={`border-b last:border-0 ${item.isOrphan ? 'bg-red-500/5' : ''}`}>
                    <td className="py-2 pr-4">
                      <span className="font-medium">{item.title || 'Untitled'}</span>
                      {item.isOrphan && <span className="ml-2 text-[10px] text-red-500 font-semibold">ORPHAN</span>}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      <span className={item.outgoing === 0 ? 'text-yellow-600' : ''}>{item.outgoing}</span>
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      <span className={item.incoming === 0 ? 'text-red-500 font-bold' : ''}>{item.incoming}</span>
                    </td>
                    <td className="py-2">
                      {item.isOrphan ? (
                        <Badge variant="destructive">Needs Links</Badge>
                      ) : item.outgoing === 0 ? (
                        <Badge variant="outline">No Outgoing</Badge>
                      ) : (
                        <Badge variant="secondary">Linked</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
