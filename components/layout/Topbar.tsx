'use client';

import { usePathname } from 'next/navigation';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';

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

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { credits, pricingPlan, agents } = useWorkspace();

  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const used = credits.aiCalls || 0;
  const pct = Math.min((used / limits.aiCalls) * 100, 100);
  const activeAgents = Object.values(agents.registry).filter((a) => a.enabled).length;

  const breadcrumbs = buildBreadcrumb(pathname);

  // Dispatch Ctrl+K to open the command palette
  function handleSearchClick() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  }

  return (
    <header className="h-13 bg-transparent backdrop-blur-sm border-b border-border flex items-center px-3 md:px-5 gap-2 md:gap-3 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        aria-label="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          Conduit
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            <span className="text-muted-foreground/50 shrink-0">/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium capitalize text-foreground truncate">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors capitalize truncate hidden sm:inline">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Search — opens command palette, hidden on smallest screens */}
      <div className="flex-1 max-w-md mx-auto hidden sm:block">
        <button
          type="button"
          onClick={handleSearchClick}
          className="w-full relative flex items-center h-8 text-xs bg-muted/40 pl-8 pr-3 border border-border rounded-md text-muted-foreground hover:border-blue-500/50 transition-colors cursor-pointer text-left"
        >
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search or ask AI...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Credit Meter — hidden on mobile */}
      <Link href="/settings" className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg border border-border hover:border-blue-500/40 transition-colors cursor-pointer">
        <span className="text-sm">{'\uD83D\uDD2E'}</span>
        <div>
          <div className="text-[11px] font-medium">AI: {used}/{limits.aiCalls}</div>
          <Progress value={pct} className="h-1 w-16" />
        </div>
      </Link>

      {/* Agent Widget — hidden on mobile */}
      <Link href="/agents" className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/40 rounded-lg border border-border text-[11px] text-muted-foreground hover:border-blue-500/40 transition-colors">
        <span>{'\uD83E\uDD16'}</span>
        <span className={activeAgents > 0 ? 'text-emerald-400' : ''}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${activeAgents > 0 ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
          {activeAgents} active
        </span>
      </Link>

      {/* Quick Actions — hide media on small, keep new content */}
      <Link href="/media" className="hidden md:block">
        <Button variant="secondary" size="sm" className="text-xs">{'\uD83D\uDCCE'} Media</Button>
      </Link>
      <Link href="/editor/new">
        <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
          <span className="hidden sm:inline">+ New Content</span>
          <span className="sm:hidden">+</span>
        </Button>
      </Link>

      {/* Notification Bell */}
      <NotificationBell />

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 transition-shadow shrink-0">
        U
      </div>
    </header>
  );
}
