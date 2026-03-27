'use client';

import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const VISUAL_TOOLS = [
  {
    title: 'Thumbnails',
    desc: 'Generate eye-catching YouTube & blog thumbnails with AI-powered templates',
    icon: '🖼',
    href: '/visuals/thumbnails',
    color: 'border-violet-500/30 hover:border-violet-500/60',
    count: 'thumbnails',
  },
  {
    title: 'Featured Images',
    desc: 'Create OG images & hero graphics optimized for social sharing',
    icon: '🌅',
    href: '/visuals/featured',
    color: 'border-cyan-500/30 hover:border-cyan-500/60',
    count: 'featured',
  },
  {
    title: 'Infographics',
    desc: 'Build data-driven infographics from your content and stats',
    icon: '📊',
    href: '/visuals/infographics',
    color: 'border-amber-500/30 hover:border-amber-500/60',
    count: 'infographics',
  },
];

export default function VisualStudioPage() {
  const { media, content } = useWorkspace();

  const imageMedia = media.filter((m) => m.type.startsWith('image'));
  const recentVisuals = imageMedia.slice(0, 8);
  const articlesWithImages = content.filter((c) => c.featuredImage);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Design</p>
        <h1 className="text-2xl font-bold">Visual Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {imageMedia.length} visuals in library &middot; {articlesWithImages.length} articles with featured images
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {VISUAL_TOOLS.map((tool) => (
          <Link key={tool.title} href={tool.href}>
            <Card className={`bg-card ${tool.color} transition-colors cursor-pointer h-full`}>
              <CardContent className="p-5">
                <div className="text-3xl mb-3">{tool.icon}</div>
                <h3 className="font-semibold mb-1">{tool.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{tool.desc}</p>
                <Button size="sm" variant="outline" className="w-full">Open Studio</Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Create */}
      <div className="flex gap-2 mb-6">
        <Link href="/visuals/thumbnails"><Button size="sm">+ New Thumbnail</Button></Link>
        <Link href="/visuals/featured"><Button size="sm" variant="outline">+ Featured Image</Button></Link>
        <Link href="/visuals/infographics"><Button size="sm" variant="outline">+ Infographic</Button></Link>
      </div>

      {/* Recent Visuals Gallery */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Recent Visuals</CardTitle>
        </CardHeader>
        <CardContent>
          {recentVisuals.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {recentVisuals.map((m) => (
                <div key={m.id} className="aspect-video rounded-lg bg-muted border border-border overflow-hidden relative group">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                    {m.name}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="truncate">{m.name}</div>
                    <Badge variant="secondary" className="text-[9px] mt-0.5">{m.source || 'upload'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-3">🎨</p>
              <p className="font-medium mb-1">No visuals yet</p>
              <p className="text-xs mb-3">Create thumbnails, featured images, or infographics to get started</p>
              <Link href="/visuals/thumbnails">
                <Button size="sm">Create Your First Visual</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
