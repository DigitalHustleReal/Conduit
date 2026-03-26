'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/stores/workspace';
import { useState } from 'react';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  href: string;
}

interface NavGroup {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Overview', items: [
    { id: 'dashboard', icon: '⚡', label: 'Dashboard', href: '/dashboard' },
  ]},
  { title: 'Intelligence', items: [
    { id: 'chat', icon: '💬', label: 'AI Chat', href: '/chat' },
    { id: 'ai-studio', icon: '✦', label: 'AI Studio', href: '/ai-studio' },
    { id: 'agents', icon: '🤖', label: 'AI Agents', href: '/agents' },
    { id: 'templates', icon: '📚', label: 'Templates', href: '/templates' },
    { id: 'prompt-library', icon: '⚡', label: 'Prompt Library', href: '/prompt-library' },
    { id: 'seo', icon: '🔍', label: 'SEO Center', href: '/seo' },
    { id: 'analytics', icon: '📈', label: 'Analytics', href: '/analytics' },
  ]},
  { title: 'Content', items: [
    { id: 'collections', icon: '🗂', label: 'Collections', href: '/collections' },
    { id: 'editor', icon: '📄', label: 'Content', href: '/editor' },
    { id: 'media', icon: '🖼', label: 'Media Library', href: '/media' },
    { id: 'pipeline', icon: '🗃', label: 'Pipeline', href: '/pipeline' },
  ]},
  { title: 'SEO Tools', collapsible: true, items: [
    { id: 'geo-seo', icon: '🤖', label: 'AI SEO / GEO', href: '/geo-seo' },
    { id: 'prog-seo', icon: '📐', label: 'Programmatic SEO', href: '/prog-seo' },
    { id: 'algo-updates', icon: '📡', label: 'Algorithm Radar', href: '/algo-updates' },
  ]},
  { title: 'Creator', collapsible: true, items: [
    { id: 'creator', icon: '🎬', label: 'Creator Studio', href: '/creator' },
    { id: 'visuals', icon: '🎨', label: 'Visual Studio', href: '/visuals' },
  ]},
  { title: 'Monetization', items: [
    { id: 'monetisation', icon: '💰', label: 'Monetisation', href: '/monetisation' },
    { id: 'interlinks', icon: '🔗', label: 'Content Links', href: '/interlinks' },
  ]},
  { title: 'Settings', items: [
    { id: 'ai-engine', icon: '✦', label: 'AI Engine', href: '/ai-engine' },
    { id: 'automations', icon: '⚡', label: 'Automations', href: '/automations' },
    { id: 'team', icon: '👥', label: 'Team', href: '/team' },
    { id: 'settings', icon: '💳', label: 'Settings & Billing', href: '/settings' },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const { siteName } = useWorkspace();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'SEO Tools': true, 'Creator': true });

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col h-full overflow-y-auto shrink-0">
      {/* Brand */}
      <div className="p-4 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
          ✦
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight">Conduit</div>
          <div className="text-[10px] text-muted-foreground font-mono">v8.0</div>
        </div>
      </div>

      {/* Workspace */}
      <div className="mx-3 mt-2.5 mb-1 p-2 bg-muted rounded-lg border border-border text-xs font-semibold truncate">
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
              {group.title} {group.collapsible && (collapsed[group.title] ? '▸' : '▾')}
            </div>

            {!collapsed[group.title] && group.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-1.5 mx-2 rounded-lg text-[12.5px] transition-colors',
                    isActive
                      ? 'bg-violet-500/10 text-violet-400 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
        141 agents · 12 APIs
      </div>
    </aside>
  );
}
