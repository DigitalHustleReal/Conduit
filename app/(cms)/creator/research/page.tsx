'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TrendingTopic {
  topic: string;
  growth: string;
  competition: 'Low' | 'Medium' | 'High';
  opportunity: number;
}

interface ContentGap {
  topic: string;
  yourCoverage: string;
  competitorCoverage: string;
  priority: 'High' | 'Medium' | 'Low';
}

export default function ResearchPage() {
  const { settings, deductCredit } = useWorkspace();
  const niche = settings.niche || 'your niche';

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [trending, setTrending] = useState<TrendingTopic[]>([
    { topic: `${niche} for beginners 2026`, growth: '+340%', competition: 'Low', opportunity: 92 },
    { topic: `Best ${niche} tools`, growth: '+180%', competition: 'Medium', opportunity: 78 },
    { topic: `${niche} mistakes to avoid`, growth: '+120%', competition: 'Low', opportunity: 85 },
    { topic: `How to start ${niche}`, growth: '+95%', competition: 'High', opportunity: 65 },
    { topic: `${niche} vs alternatives`, growth: '+75%', competition: 'Medium', opportunity: 72 },
  ]);

  const [gaps] = useState<ContentGap[]>([
    { topic: `${niche} case studies`, yourCoverage: 'None', competitorCoverage: '3 videos', priority: 'High' },
    { topic: `${niche} tutorial series`, yourCoverage: '1 video', competitorCoverage: '8 videos', priority: 'High' },
    { topic: `${niche} industry news`, yourCoverage: 'None', competitorCoverage: 'Weekly updates', priority: 'Medium' },
    { topic: `${niche} interviews`, yourCoverage: 'None', competitorCoverage: '5 interviews', priority: 'Low' },
  ]);

  const [competitors] = useState([
    { name: 'Competitor Channel A', subscribers: '125K', avgViews: '15K', uploadFreq: '3x/week', strength: 'Tutorials' },
    { name: 'Competitor Channel B', subscribers: '89K', avgViews: '22K', uploadFreq: '2x/week', strength: 'Reviews' },
    { name: 'Competitor Channel C', subscribers: '45K', avgViews: '8K', uploadFreq: '1x/week', strength: 'News' },
  ]);

  function handleResearch() {
    if (!searchQuery.trim()) return;
    if (!deductCredit('aiCalls')) return;

    setLoading(true);
    setTimeout(() => {
      setTrending((prev) => [
        { topic: searchQuery, growth: '+200%', competition: 'Low', opportunity: 88 },
        ...prev,
      ]);
      setLoading(false);
    }, 1200);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Creator / Research</p>
        <h1 className="text-2xl font-bold">Video Research</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover trending topics and content gaps in {niche}.</p>
      </div>

      {/* Search */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Research a topic..." className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleResearch()} />
            <Button onClick={handleResearch} disabled={loading}>{loading ? 'Researching...' : 'Research'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Trending Topics</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {trending.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">{i + 1}</div>
                  <span className="text-sm font-medium">{t.topic}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-400 font-mono">{t.growth}</span>
                  <Badge variant={t.competition === 'Low' ? 'default' : t.competition === 'Medium' ? 'secondary' : 'destructive'} className="text-[10px]">
                    {t.competition}
                  </Badge>
                  <div className="w-16 text-right">
                    <span className="text-xs font-semibold" style={{ color: t.opportunity >= 80 ? '#34d399' : t.opportunity >= 60 ? '#fbbf24' : '#f87171' }}>
                      {t.opportunity}/100
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitor Analysis */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-sm">Competitor Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {competitors.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Strength: {c.strength}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{c.subscribers} subs</span>
                  <span>{c.avgViews} avg views</span>
                  <Badge variant="outline" className="text-[10px]">{c.uploadFreq}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Gaps */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Content Gap Finder</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gaps.map((g, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div>
                  <div className="text-sm font-medium">{g.topic}</div>
                  <div className="text-xs text-muted-foreground">You: {g.yourCoverage} | Competitors: {g.competitorCoverage}</div>
                </div>
                <Badge variant={g.priority === 'High' ? 'destructive' : g.priority === 'Medium' ? 'secondary' : 'outline'} className="text-[10px]">
                  {g.priority} Priority
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
