'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { useState } from 'react';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  href: string;
  pro?: boolean;
}

interface NavGroup {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Overview', items: [
    { id: 'dashboard', icon: '\u26A1', label: 'Dashboard', href: '/dashboard' },
  ]},
  { title: 'Intelligence', items: [
    { id: 'chat', icon: '\uD83D\uDCAC', label: 'AI Chat', href: '/chat' },
    { id: 'ai-studio', icon: '\u2726', label: 'AI Studio', href: '/ai-studio' },
    { id: 'agents', icon: '\uD83E\uDD16', label: 'AI Agents', href: '/agents' },
    { id: 'templates', icon: '\uD83D\uDCDA', label: 'Templates', href: '/templates' },
    { id: 'prompt-library', icon: '\u26A1', label: 'Prompt Library', href: '/prompt-library', pro: true },
    { id: 'seo', icon: '\uD83D\uDD0D', label: 'SEO Center', href: '/seo' },
    { id: 'analytics', icon: '\uD83D\uDCC8', label: 'Analytics', href: '/analytics' },
  ]},
  { title: 'Content', items: [
    { id: 'collections', icon: '\uD83D\uDDC2', label: 'Collections', href: '/collections' },
    { id: 'editor', icon: '\uD83D\uDCC4', label: 'Content', href: '/editor' },
    { id: 'media', icon: '\uD83D\uDDBC', label: 'Media Library', href: '/media' },
    { id: 'pipeline', icon: '\uD83D\uDDC3', label: 'Pipeline', href: '/pipeline' },
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

export function Sidebar() {
  const pathname = usePathname();
  const { siteName, credits, pricingPlan } = useWorkspace();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'SEO Tools': true, 'Creator': true });

  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;
  const used = credits.aiCalls || 0;
  const pct = Math.min((used / limits.aiCalls) * 100, 100);

  return (
    <aside className="w-60 flex flex-col h-full overflow-y-auto shrink-0 border-r border-border bg-gradient-to-b from-[oklch(0.18_0.005_280)] via-[oklch(0.16_0.003_270)] to-[oklch(0.14_0_0)]">
      {/* Brand */}
      <div className="p-4 border-b border-border/60 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
          {'\u2726'}
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight text-foreground">Conduit</div>
          <div className="text-[10px] text-muted-foreground font-mono">v8.0</div>
        </div>
      </div>

      {/* Workspace */}
      <div className="mx-3 mt-2.5 mb-1 p-2 bg-muted/50 rounded-lg border border-border/50 text-xs font-semibold truncate text-foreground">
        {siteName}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-1">
            <div
              className={cn(
                'px-4 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-mono',
                group.collapsible && 'cursor-pointer hover:text-foreground'
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
                      ? 'bg-violet-500/10 text-violet-400 font-semibold border-l-[3px] border-violet-500 ml-2 pl-3.5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.pro && (
                    <span className="text-[8px] font-bold tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded-full uppercase">
                      Pro
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer with credit meter */}
      <div className="p-3 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>AI Credits</span>
          <span className="font-mono">{used}/{limits.aiCalls}</span>
        </div>
        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-violet-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground">
          141 agents &middot; 12 APIs
        </div>
      </div>
    </aside>
  );
}
