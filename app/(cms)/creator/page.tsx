'use client';

import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const STUDIO_CARDS = [
  { title: 'YouTube Scripts', desc: 'Full-length video scripts with hooks, intros, and CTAs', icon: '🎬', href: '/creator/script', color: 'hover:border-red-500/50' },
  { title: 'Shorts / Reels', desc: 'Short-form scripts for TikTok, Shorts, and Reels', icon: '📱', href: '/creator/shorts', color: 'hover:border-pink-500/50' },
  { title: 'Video SEO', desc: 'Optimize titles, descriptions, and tags for discovery', icon: '🔍', href: '/creator/seo', color: 'hover:border-cyan-500/50' },
  { title: 'Video Research', desc: 'Trending topics, competitor analysis, and content gaps', icon: '📊', href: '/creator/research', color: 'hover:border-amber-500/50' },
];

export default function CreatorStudioPage() {
  const { content, analyticsEvents } = useWorkspace();

  const scriptsGenerated = analyticsEvents.filter((e) => e.type === 'script_generated').length;
  const videosPlanned = content.filter((c) => c.collection === 'Videos' || c.collection === 'Scripts').length;

  const recentScripts = content
    .filter((c) => c.collection === 'Scripts' || c.collection === 'Videos')
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Creator</p>
        <h1 className="text-2xl font-bold">Creator Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Video content creation tools powered by AI.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-violet-400">{scriptsGenerated}</div>
            <div className="text-xs text-muted-foreground">Scripts Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-400">{videosPlanned}</div>
            <div className="text-xs text-muted-foreground">Videos Planned</div>
          </CardContent>
        </Card>
      </div>

      {/* Studio Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {STUDIO_CARDS.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className={`transition-colors cursor-pointer ${c.color}`}>
              <CardContent className="p-5">
                <div className="text-3xl mb-3">{c.icon}</div>
                <div className="font-semibold mb-1">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Scripts */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Scripts</CardTitle></CardHeader>
        <CardContent>
          {recentScripts.length > 0 ? (
            <div className="space-y-2">
              {recentScripts.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px]">{s.collection}</Badge>
                    <span className="text-sm">{s.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{(s.wordCount || 0).toLocaleString()} words</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg mb-2">No scripts yet</p>
              <p className="text-sm">Use the tools above to generate your first video script.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
