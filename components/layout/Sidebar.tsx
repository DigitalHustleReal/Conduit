'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { useState, useEffect, useRef, useCallback } from 'react';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  href: string;
  pro?: boolean;
  isNew?: boolean;
}

interface NavGroup {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Overview', items: [
    { id: 'dashboard', icon: '\u26A1', label: 'Dashboard', href: '/dashboard' },
    { id: 'review', icon: '\u2714', label: 'Review Queue', href: '/review' },
    { id: 'autopilot', icon: '\uD83E\uDD16', label: 'Autopilot', href: '/autopilot', isNew: true },
  ]},
  { title: 'Intelligence', items: [
    { id: 'chat', icon: '\uD83D\uDCAC', label: 'AI Chat', href: '/chat' },
    { id: 'ai-studio', icon: '\u2726', label: 'AI Studio', href: '/ai-studio' },
    { id: 'agents', icon: '\uD83E\uDD16', label: 'AI Agents', href: '/agents' },
    { id: 'templates', icon: '\uD83D\uDCDA', label: 'Templates', href: '/templates' },
    { id: 'prompt-library', icon: '\u26A1', label: 'Prompt Library', href: '/prompt-library', pro: true },
    { id: 'seo', icon: '\uD83D\uDD0D', label: 'SEO Center', href: '/seo' },
    { id: 'strategy', icon: '\u265F', label: 'Strategy', href: '/strategy', isNew: true },
    { id: 'analytics', icon: '\uD83D\uDCC8', label: 'Analytics', href: '/analytics' },
    { id: 'performance', icon: '\uD83C\uDFAF', label: 'Performance', href: '/performance', isNew: true },
  ]},
  { title: 'Content', items: [
    { id: 'collections', icon: '\uD83D\uDDC2', label: 'Collections', href: '/collections' },
    { id: 'editor', icon: '\uD83D\uDCC4', label: 'Content', href: '/editor' },
    { id: 'import', icon: '\uD83D\uDCE5', label: 'Import', href: '/import' },
    { id: 'media', icon: '\uD83D\uDDBC', label: 'Media Library', href: '/media' },
    { id: 'pipeline', icon: '\uD83D\uDDC3', label: 'Pipeline', href: '/pipeline' },
    { id: 'publishing', icon: '\uD83D\uDE80', label: 'Publishing', href: '/publish-settings', isNew: true },
  ]},
  { title: 'SEO Tools', collapsible: true, items: [
    { id: 'geo-seo', icon: '\uD83E\uDD16', label: 'AI SEO / GEO', href: '/geo-seo', pro: true },
    { id: 'prog-seo', icon: '\uD83D\uDCD0', label: 'Programmatic SEO', href: '/prog-seo', pro: true },
    { id: 'algo-updates', icon: '\uD83D\uDCE1', label: 'Algorithm Radar', href: '/algo-updates' },
  ]},
  { title: 'Creator', collapsible: true, items: [
    { id: 'creator', icon: '\uD83C\uDFAC', label: 'Creator Studio', href: '/creator', pro: true },
    { id: 'visuals', icon: '\uD83C\uDFA8', label: 'Visual Studio', href: '/visuals', pro: true },
  ]},
  { title: 'Distribution', items: [
    { id: 'social', icon: '\uD83D\uDCE2', label: 'Social', href: '/social' },
    { id: 'repurpose', icon: '\u267B', label: 'Repurpose', href: '/repurpose', isNew: true },
  ]},
  { title: 'Monetization', items: [
    { id: 'monetisation', icon: '\uD83D\uDCB0', label: 'Monetisation', href: '/monetisation' },
    { id: 'interlinks', icon: '\uD83D\uDD17', label: 'Content Links', href: '/interlinks' },
  ]},
  { title: 'Settings', items: [
    { id: 'ai-engine', icon: '\u2726', label: 'AI Engine', href: '/ai-engine' },
    { id: 'automations', icon: '\u26A1', label: 'Automations', href: '/automations' },
    { id: 'team', icon: '\uD83D\uDC65', label: 'Team', href: '/team' },
    { id: 'settings', icon: '\uD83D\uDCB3', label: 'Settings & Billing', href: '/settings' },
  ]},
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { siteName, credits, pricingPlan, reviewQueue } = useWorkspace();
  const pendingReviewCount = reviewQueue?.filter((q) => q.status === 'pending')?.length ?? 0;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'SEO Tools': true, 'Creator': true });

  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const used = credits.aiCalls || 0;
  const pct = Math.min((used / limits.aiCalls) * 100, 100);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (open && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Swipe-to-close gesture
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -80 && onClose) {
      onClose();
    }
    touchStartX.current = null;
  }, [onClose]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sidebarContent = (
    <>
      {/* Brand — clickable, links to dashboard */}
      <Link href="/dashboard" className="p-4 border-b border-sidebar-border flex items-center gap-2.5 hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">
          {'\u2726'}
        </div>
        <div className="flex-1">
          <div className="text-sm font-extrabold tracking-tight text-sidebar-foreground">Conduit</div>
          <div className="text-[10px] text-sidebar-foreground/50 font-mono">v8.0</div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Link>

      {/* Workspace */}
      <div className="mx-3 mt-2.5 mb-1 p-2 bg-sidebar-accent rounded-lg border border-sidebar-border text-xs font-semibold text-sidebar-foreground overflow-hidden">
        <div className="truncate" title={siteName}>{siteName}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-1">
            <div
              className={cn(
                'px-4 py-1.5 text-[9px] uppercase tracking-widest text-sidebar-foreground/50 font-mono',
                group.collapsible && 'cursor-pointer hover:text-sidebar-foreground'
              )}
              onClick={() => {
                if (group.collapsible) {
                  setCollapsed((prev) => ({ ...prev, [group.title]: !prev[group.title] }));
                }
              }}
            >
              {group.title} {group.collapsible && (collapsed[group.title] ? '\u25B8' : '\u25BE')}
            </div>

            {!collapsed[group.title] && group.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-1.5 mx-2 rounded-lg text-[12.5px] transition-all duration-200 relative',
                    isActive
                      ? 'bg-blue-500/10 text-blue-400 font-semibold border-l-[3px] border-blue-500 ml-2 pl-3.5 shadow-[inset_0_0_12px_rgba(59,130,246,0.06)]'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.pro && (
                    <span className="text-[8px] font-bold tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/25 px-1.5 py-0.5 rounded-full uppercase">
                      Pro
                    </span>
                  )}
                  {item.isNew && (
                    <span className="text-[8px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full uppercase">
                      New
                    </span>
                  )}
                  {item.id === 'review' && pendingReviewCount > 0 && (
                    <span className="text-[9px] font-bold min-w-[20px] text-center bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                      {pendingReviewCount > 99 ? '99+' : pendingReviewCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer with credit meter */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/50">
          <span>AI Credits</span>
          <span className="font-mono">{used}/{limits.aiCalls}</span>
        </div>
        <div className="h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 80 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-400'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] text-sidebar-foreground/50">
          141 agents &middot; 12 APIs
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Backdrop overlay — mobile only */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base styles
          'w-60 flex flex-col h-full overflow-y-auto shrink-0 border-r border-sidebar-border bg-sidebar',
          // Mobile: fixed overlay drawer with slide animation
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:transition-none',
          // Mobile open/close
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
