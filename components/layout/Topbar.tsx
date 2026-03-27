'use client';

import { usePathname } from 'next/navigation';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

function buildBreadcrumb(pathname: string | null): { label: string; href: string }[] {
  if (!pathname) return [{ label: 'Dashboard', href: '/dashboard' }];
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = '';
  for (const part of parts) {
    path += '/' + part;
    crumbs.push({ label: part.replace(/-/g, ' '), href: path });
  }
  return crumbs.length ? crumbs : [{ label: 'Dashboard', href: '/dashboard' }];
}

export function Topbar() {
  const pathname = usePathname();
  const { credits, pricingPlan, agents } = useWorkspace();

  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const used = credits.aiCalls || 0;
  const pct = Math.min((used / limits.aiCalls) * 100, 100);
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;

  const breadcrumbs = buildBreadcrumb(pathname);

  return (
    <header className="h-13 bg-transparent backdrop-blur-sm border-b border-border flex items-center px-5 gap-3 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          Conduit
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/50">/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium capitalize text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors capitalize">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input placeholder="Search or ask AI... (Ctrl+K)" className="h-8 text-xs bg-muted/40 pl-8 border-border focus:border-blue-500/50" />
        </div>
      </div>

      {/* Credit Meter */}
      <Link href="/settings" className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg border border-border hover:border-blue-500/40 transition-colors cursor-pointer">
        <span className="text-sm">{'\uD83D\uDD2E'}</span>
        <div>
          <div className="text-[11px] font-medium">AI: {used}/{limits.aiCalls}</div>
          <Progress value={pct} className="h-1 w-16" />
        </div>
      </Link>

      {/* Agent Widget */}
      <Link href="/agents" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/40 rounded-lg border border-border text-[11px] text-muted-foreground hover:border-blue-500/40 transition-colors">
        <span>{'\uD83E\uDD16'}</span>
        <span className={activeAgents > 0 ? 'text-emerald-400' : ''}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${activeAgents > 0 ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
          {activeAgents} active
        </span>
      </Link>

      {/* Quick Actions */}
      <Link href="/media">
        <Button variant="secondary" size="sm" className="text-xs">{'\uD83D\uDCCE'} Media</Button>
      </Link>
      <Link href="/editor/new">
        <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">+ New Content</Button>
      </Link>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 transition-shadow">
        U
      </div>
    </header>
  );
}
