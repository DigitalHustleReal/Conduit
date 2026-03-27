'use client';

import { useState, useEffect, useCallback } from 'react';
import { type Theme, getTheme, setTheme, applyTheme } from '@/lib/theme';

const CYCLE: Theme[] = ['dark', 'light', 'system'];

const LABELS: Record<Theme, string> = {
  dark: 'Dark mode',
  light: 'Light mode',
  system: 'System theme',
};

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path
        fillRule="evenodd"
        d="M3 5a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v4h8V6zM7 16a1 1 0 100-2 1 1 0 000 2zm6-1a1 1 0 11-2 0 1 1 0 012 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setCurrentTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCurrentTheme(getTheme());
    setMounted(true);

    // Listen for system preference changes when in system mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getTheme() === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const cycle = useCallback(() => {
    const idx = CYCLE.indexOf(theme);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setTheme(next);
    setCurrentTheme(next);
  }, [theme]);

  // Avoid hydration mismatch -- render a placeholder until mounted
  if (!mounted) {
    return (
      <button
        className={`relative w-8 h-8 rounded-lg border border-slate-700/30 bg-slate-800/40 flex items-center justify-center ${className}`}
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const Icon = theme === 'dark' ? MoonIcon : theme === 'light' ? SunIcon : MonitorIcon;

  return (
    <button
      onClick={cycle}
      title={LABELS[theme]}
      aria-label={LABELS[theme]}
      className={`relative w-8 h-8 rounded-lg border border-slate-700/30 dark:bg-slate-800/40 bg-slate-200/60 flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-blue-400 hover:border-blue-500/40 transition-all duration-200 cursor-pointer ${className}`}
    >
      <span className="transition-transform duration-300 ease-in-out inline-flex">
        <Icon className="w-4 h-4" />
      </span>
    </button>
  );
}
