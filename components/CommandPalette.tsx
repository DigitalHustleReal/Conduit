'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/stores/workspace';
import { getTheme, setTheme } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  category: 'navigation' | 'action' | 'content' | 'keyword';
  icon: string;
  shortcut?: string;
  action: () => void;
}

// ---------------------------------------------------------------------------
// Fuzzy match helper
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // character-by-character fuzzy
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<Command['category'], string> = {
  navigation: 'Navigation',
  action: 'Actions',
  content: 'Content',
  keyword: 'Keywords',
};

const CATEGORY_ORDER: Command['category'][] = ['navigation', 'action', 'content', 'keyword'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { content, keywords, autopilot, setAutopilot } = useWorkspace();

  // -----------------------------------------------------------------------
  // Open / close
  // -----------------------------------------------------------------------

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  // -----------------------------------------------------------------------
  // Global keyboard shortcut: Ctrl+K / Cmd+K
  // -----------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        closePalette();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, openPalette, closePalette]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // -----------------------------------------------------------------------
  // Static commands
  // -----------------------------------------------------------------------

  const staticCommands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'navigation', icon: '\u26A1', shortcut: '', action: () => router.push('/dashboard') },
      { id: 'nav-editor', label: 'Go to Editor', category: 'navigation', icon: '\uD83D\uDCC4', action: () => router.push('/editor') },
      { id: 'nav-ai-studio', label: 'Go to AI Studio', category: 'navigation', icon: '\u2726', action: () => router.push('/ai-studio') },
      { id: 'nav-agents', label: 'Go to Agents', category: 'navigation', icon: '\uD83E\uDD16', action: () => router.push('/agents') },
      { id: 'nav-settings', label: 'Go to Settings', category: 'navigation', icon: '\uD83D\uDCB3', action: () => router.push('/settings') },
      { id: 'nav-autopilot', label: 'Go to Autopilot', category: 'navigation', icon: '\uD83E\uDD16', action: () => router.push('/autopilot') },
      { id: 'nav-review', label: 'Go to Review Queue', category: 'navigation', icon: '\u2714', action: () => router.push('/review') },
      { id: 'nav-strategy', label: 'Go to Strategy', category: 'navigation', icon: '\u265F', action: () => router.push('/strategy') },
      { id: 'nav-chat', label: 'Go to AI Chat', category: 'navigation', icon: '\uD83D\uDCAC', action: () => router.push('/chat') },
      { id: 'nav-seo', label: 'Go to SEO Center', category: 'navigation', icon: '\uD83D\uDD0D', action: () => router.push('/seo') },
      { id: 'nav-analytics', label: 'Go to Analytics', category: 'navigation', icon: '\uD83D\uDCC8', action: () => router.push('/analytics') },
      { id: 'nav-performance', label: 'Go to Performance', category: 'navigation', icon: '\uD83C\uDFAF', action: () => router.push('/performance') },
      { id: 'nav-collections', label: 'Go to Collections', category: 'navigation', icon: '\uD83D\uDDC2', action: () => router.push('/collections') },
      { id: 'nav-media', label: 'Go to Media Library', category: 'navigation', icon: '\uD83D\uDDBC', action: () => router.push('/media') },
      { id: 'nav-pipeline', label: 'Go to Pipeline', category: 'navigation', icon: '\uD83D\uDDC3', action: () => router.push('/pipeline') },
      { id: 'nav-geo-seo', label: 'Go to AI SEO / GEO', category: 'navigation', icon: '\uD83E\uDD16', action: () => router.push('/geo-seo') },
      { id: 'nav-prog-seo', label: 'Go to Programmatic SEO', category: 'navigation', icon: '\uD83D\uDCD0', action: () => router.push('/prog-seo') },
      { id: 'nav-social', label: 'Go to Social', category: 'navigation', icon: '\uD83D\uDCE2', action: () => router.push('/social') },
      { id: 'nav-monetisation', label: 'Go to Monetisation', category: 'navigation', icon: '\uD83D\uDCB0', action: () => router.push('/monetisation') },
      { id: 'nav-interlinks', label: 'Go to Content Links', category: 'navigation', icon: '\uD83D\uDD17', action: () => router.push('/interlinks') },
      { id: 'nav-import', label: 'Go to Import', category: 'navigation', icon: '\uD83D\uDCE5', action: () => router.push('/import') },
      { id: 'nav-automations', label: 'Go to Automations', category: 'navigation', icon: '\u26A1', action: () => router.push('/automations') },
      { id: 'nav-team', label: 'Go to Team', category: 'navigation', icon: '\uD83D\uDC65', action: () => router.push('/team') },
      { id: 'nav-templates', label: 'Go to Templates', category: 'navigation', icon: '\uD83D\uDCDA', action: () => router.push('/templates') },
      { id: 'nav-prompt-library', label: 'Go to Prompt Library', category: 'navigation', icon: '\u26A1', action: () => router.push('/prompt-library') },
      { id: 'nav-creator', label: 'Go to Creator Studio', category: 'navigation', icon: '\uD83C\uDFAC', action: () => router.push('/creator') },
      { id: 'nav-visuals', label: 'Go to Visual Studio', category: 'navigation', icon: '\uD83C\uDFA8', action: () => router.push('/visuals') },
      { id: 'nav-repurpose', label: 'Go to Repurpose', category: 'navigation', icon: '\u267B', action: () => router.push('/repurpose') },
      { id: 'nav-publishing', label: 'Go to Publishing', category: 'navigation', icon: '\uD83D\uDE80', action: () => router.push('/publish-settings') },
      { id: 'nav-algo', label: 'Go to Algorithm Radar', category: 'navigation', icon: '\uD83D\uDCE1', action: () => router.push('/algo-updates') },
      { id: 'nav-ai-engine', label: 'Go to AI Engine', category: 'navigation', icon: '\u2726', action: () => router.push('/ai-engine') },
    ];

    const actions: Command[] = [
      { id: 'act-new-article', label: 'New Article', category: 'action', icon: '\u2795', shortcut: '', action: () => router.push('/editor/new') },
      { id: 'act-ai-studio', label: 'Run AI Studio Tool', category: 'action', icon: '\u2726', action: () => router.push('/ai-studio') },
      { id: 'act-keyword-discovery', label: 'Run Keyword Discovery', category: 'action', icon: '\uD83D\uDD0D', action: () => router.push('/seo') },
      {
        id: 'act-toggle-autopilot',
        label: autopilot.enabled ? 'Disable Autopilot' : 'Enable Autopilot',
        category: 'action',
        icon: '\uD83E\uDD16',
        action: () => setAutopilot({ enabled: !autopilot.enabled }),
      },
      {
        id: 'act-toggle-theme',
        label: 'Toggle Theme',
        category: 'action',
        icon: '\uD83C\uDF19',
        action: () => {
          const current = getTheme();
          setTheme(current === 'dark' ? 'light' : 'dark');
          // Force re-render by closing palette
        },
      },
      { id: 'act-admin', label: 'Open Admin Panel', category: 'action', icon: '\uD83D\uDD12', action: () => router.push('/admin') },
    ];

    return [...nav, ...actions];
  }, [router, autopilot.enabled, setAutopilot]);

  // -----------------------------------------------------------------------
  // Dynamic commands from content & keywords
  // -----------------------------------------------------------------------

  const dynamicCommands = useMemo<Command[]>(() => {
    if (!query || query.length < 2) return [];

    const contentCmds: Command[] = content
      .filter((c) => fuzzyMatch(query, c.title))
      .slice(0, 5)
      .map((c) => ({
        id: `content-${c.id}`,
        label: c.title,
        category: 'content' as const,
        icon: c.status === 'published' ? '\uD83D\uDFE2' : c.status === 'draft' ? '\uD83D\uDFE1' : '\uD83D\uDFE0',
        action: () => router.push(`/editor?id=${c.id}`),
      }));

    const keywordCmds: Command[] = keywords
      .filter((k) => fuzzyMatch(query, k.keyword || k.term || ''))
      .slice(0, 5)
      .map((k) => ({
        id: `keyword-${k.id}`,
        label: k.keyword || k.term || '',
        category: 'keyword' as const,
        icon: '\uD83D\uDD11',
        action: () => router.push('/seo'),
      }));

    return [...contentCmds, ...keywordCmds];
  }, [query, content, keywords, router]);

  // -----------------------------------------------------------------------
  // Filtered and grouped commands
  // -----------------------------------------------------------------------

  const allFiltered = useMemo(() => {
    const all = [...staticCommands, ...dynamicCommands];
    if (!query) return staticCommands.filter((c) => c.category !== 'content' && c.category !== 'keyword');
    return all.filter((c) => fuzzyMatch(query, c.label));
  }, [staticCommands, dynamicCommands, query]);

  // Group by category, respecting order, max 10 total
  const grouped = useMemo(() => {
    const groups: { category: Command['category']; label: string; items: Command[] }[] = [];
    let count = 0;
    for (const cat of CATEGORY_ORDER) {
      if (count >= 10) break;
      const items = allFiltered.filter((c) => c.category === cat);
      if (items.length === 0) continue;
      const take = items.slice(0, 10 - count);
      groups.push({ category: cat, label: CATEGORY_LABELS[cat], items: take });
      count += take.length;
    }
    return groups;
  }, [allFiltered]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, selectedIndex]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // -----------------------------------------------------------------------
  // Keyboard nav inside palette
  // -----------------------------------------------------------------------

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
        closePalette();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePalette}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        item.action();
                        closePalette();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
