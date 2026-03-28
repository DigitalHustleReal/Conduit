'use client';

import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/stores/workspace';

// ---------------------------------------------------------------------------
// Types (also exported for store use)
// ---------------------------------------------------------------------------

export type NotificationType = 'agent' | 'draft' | 'publish' | 'warning' | 'error' | 'performance';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<NotificationType, string> = {
  agent: 'text-emerald-400',
  draft: 'text-blue-400',
  publish: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  performance: 'text-amber-400',
};

const TYPE_ICONS: Record<NotificationType, string> = {
  agent: '\uD83E\uDD16',
  draft: '\uD83D\uDCC4',
  publish: '\uD83D\uDE80',
  warning: '\u26A0',
  error: '\u274C',
  performance: '\uD83D\uDCC9',
};

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notifications, markAllNotificationsRead, clearOldNotifications } = useWorkspace();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // Clean up old notifications on mount
  useEffect(() => {
    clearOldNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recent = notifications.slice(0, 20);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 rounded-lg border border-border bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-blue-400 hover:border-blue-500/40 transition-all duration-200 cursor-pointer"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              recent.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors ${
                    notification.read ? 'opacity-60' : 'bg-muted/20'
                  }`}
                >
                  {/* Icon */}
                  <span className={`text-base shrink-0 mt-0.5 ${TYPE_COLORS[notification.type]}`}>
                    {TYPE_ICONS[notification.type]}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notification.createdAt)}</p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {recent.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border text-center">
              <span className="text-[11px] text-muted-foreground">
                {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
