'use client';

import { usePathname } from 'next/navigation';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export function Topbar() {
  const pathname = usePathname();
  const { credits, pricingPlan, agents, siteName } = useWorkspace();

  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const used = credits.aiCalls || 0;
  const pct = Math.min((used / limits.aiCalls) * 100, 100);
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;

  const pageName = pathname?.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';

  return (
    <header className="h-13 bg-card border-b border-border flex items-center px-5 gap-3 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Conduit</span>
        <span className="text-muted-foreground">›</span>
        <span className="font-medium capitalize">{pageName}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto">
        <Input placeholder="Search or ask AI…" className="h-8 text-xs bg-muted" />
      </div>

      {/* Credit Meter */}
      <Link href="/settings" className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border hover:border-violet-500 transition-colors cursor-pointer">
        <span className="text-sm">🔮</span>
        <div>
          <div className="text-[11px] font-medium">AI: {used}/{limits.aiCalls}</div>
          <Progress value={pct} className="h-1 w-16" />
        </div>
      </Link>

      {/* Agent Widget */}
      <Link href="/agents" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg border border-border text-[11px] text-muted-foreground hover:border-violet-500 transition-colors">
        <span>🤖</span>
        <span className={activeAgents > 0 ? 'text-emerald-400' : ''}>{activeAgents} active</span>
      </Link>

      {/* Quick Actions */}
      <Link href="/media">
        <Button variant="secondary" size="sm" className="text-xs">📎 Media</Button>
      </Link>
      <Link href="/editor/new">
        <Button size="sm" className="text-xs bg-violet-600 hover:bg-violet-700">+ New Content</Button>
      </Link>

      {/* Theme Toggle */}
      <button className="p-1.5 rounded-lg bg-muted border border-border hover:border-violet-500 transition-colors text-sm">
        ☀️
      </button>
    </header>
  );
}
