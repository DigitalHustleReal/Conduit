'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AlgoUpdate {
  name: string;
  date: string;
  type: 'core' | 'spam' | 'helpful' | 'link' | 'review';
  impact: 'high' | 'medium' | 'low';
  desc: string;
  tips: string[];
}

const UPDATES: AlgoUpdate[] = [
  {
    name: 'March 2025 Core Update', date: '2025-03-13', type: 'core', impact: 'high',
    desc: 'Broad core ranking update affecting content quality signals, E-E-A-T, and user satisfaction metrics across all verticals.',
    tips: ['Audit thin or low-quality content', 'Strengthen author expertise signals', 'Improve page experience and Core Web Vitals', 'Add first-hand experience to content'],
  },
  {
    name: 'December 2024 Spam Update', date: '2024-12-19', type: 'spam', impact: 'medium',
    desc: 'Targets AI-generated spam, scaled content abuse, and manipulative link practices.',
    tips: ['Remove mass-generated AI content without editorial oversight', 'Audit for unnatural link patterns', 'Ensure all content adds genuine value', 'Review third-party content on your domain'],
  },
  {
    name: 'November 2024 Core Update', date: '2024-11-11', type: 'core', impact: 'high',
    desc: 'Major ranking shifts focusing on helpful content, topical authority, and search intent alignment.',
    tips: ['Focus on satisfying user search intent', 'Build topical depth with pillar/cluster content', 'Remove or improve underperforming pages', 'Strengthen internal linking structure'],
  },
  {
    name: 'August 2024 Helpful Content Update', date: '2024-08-22', type: 'helpful', impact: 'high',
    desc: 'Classifier update rewarding people-first content and penalizing content created primarily for search engines.',
    tips: ['Write for your audience, not search engines', 'Demonstrate genuine expertise and experience', 'Avoid keyword stuffing and over-optimization', 'Add unique insights not found elsewhere'],
  },
  {
    name: 'June 2024 Link Spam Update', date: '2024-06-20', type: 'link', impact: 'medium',
    desc: 'Improved link spam detection including AI-generated guest posts and PBN patterns.',
    tips: ['Audit and disavow toxic backlinks', 'Focus on earning natural editorial links', 'Avoid link exchanges and paid link schemes', 'Build relationships for genuine mentions'],
  },
  {
    name: 'April 2024 Reviews Update', date: '2024-04-17', type: 'review', impact: 'low',
    desc: 'Product review systems update rewarding hands-on reviews with evidence of actual product use.',
    tips: ['Include original photos and videos', 'Share quantitative measurements and testing results', 'Disclose affiliate relationships clearly', 'Compare against alternatives you have actually used'],
  },
];

const TYPE_COLORS: Record<string, string> = {
  core: 'bg-red-500/10 text-red-400 border-red-500/20',
  spam: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  helpful: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  link: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};
const IMPACT_COLORS: Record<string, string> = {
  high: 'text-red-400 border-red-400/30',
  medium: 'text-amber-400 border-amber-400/30',
  low: 'text-emerald-400 border-emerald-400/30',
};

export default function AlgoRadarPage() {
  const { content } = useWorkspace();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function checkContent() {
    setChecking(true);
    setTimeout(() => {
      const published = content.filter((c) => c.status === 'published');
      const lowSeo = published.filter((c) => (c.seoScore || 0) < 60);
      const lowAi = published.filter((c) => (c.aiScore || 0) < 60);
      setResult(
        `Analyzed ${published.length} published articles.\n\n` +
        `${lowSeo.length} articles with SEO score below 60 — at risk from core updates.\n` +
        `${lowAi.length} articles with AI quality score below 60 — may be flagged by helpful content classifier.\n\n` +
        `Recommendation: Focus on improving the lowest-scoring content first. Add first-hand experience, strengthen E-E-A-T signals, and ensure each article satisfies search intent.`
      );
      setChecking(false);
    }, 1200);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">SEO Tools</p>
        <h1 className="text-2xl font-bold">Algorithm Radar</h1>
        <p className="text-sm text-muted-foreground mt-1">Track Google algorithm updates and assess impact on your content</p>
      </div>

      {/* Check button */}
      <Card className="mb-6">
        <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Impact Assessment</p>
            <p className="text-xs text-muted-foreground">Analyze your {content.length} articles against the latest algorithm requirements</p>
          </div>
          <Button onClick={checkContent} disabled={checking}>{checking ? 'Analyzing...' : 'Check My Content'}</Button>
        </CardContent>
        {result && (
          <CardContent className="pt-0">
            <div className="rounded bg-muted/50 p-3 text-xs whitespace-pre-wrap">{result}</div>
          </CardContent>
        )}
      </Card>

      {/* Timeline */}
      <h2 className="text-lg font-semibold mb-3">Update Timeline</h2>
      <div className="space-y-3">
        {UPDATES.map((u) => (
          <Card key={u.name} className="cursor-pointer hover:ring-1 hover:ring-border transition-all" onClick={() => setExpanded(expanded === u.name ? null : u.name)}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: u.impact === 'high' ? '#f87171' : u.impact === 'medium' ? '#fbbf24' : '#34d399' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{u.name}</p>
                    <Badge variant="outline" className={TYPE_COLORS[u.type]}>{u.type}</Badge>
                    <Badge variant="outline" className={IMPACT_COLORS[u.impact]}>{u.impact} impact</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{u.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{u.desc}</p>
                  {expanded === u.name && (
                    <div className="mt-3 rounded bg-muted/50 p-3">
                      <p className="text-xs font-semibold mb-2">Action Items:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {u.tips.map((tip, i) => <li key={i} className="text-xs text-muted-foreground">{tip}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
