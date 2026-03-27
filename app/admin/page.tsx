'use client';

import { useState, useEffect } from 'react';

interface Stats {
  users: number;
  workspaces: number;
  content: number;
  aiUsage: number;
  recentSignups: Array<{ id: string; email: string; full_name: string; created_at: string }>;
  recentContent: Array<{ id: string; title: string; workspace_id: string; status: string; seo_score: number; ai_score: number; created_at: string }>;
  contentByStatus: Record<string, number>;
  workspacesByPlan: Record<string, number>;
  supabaseConnected: boolean;
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: '#94a3b8' }}>{label}</span>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: '#94a3b8',
    review: '#f59e0b',
    published: '#22c55e',
    scheduled: '#8b5cf6',
    archived: '#6b7280',
  };
  const bg = colors[status] || '#94a3b8';
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${bg}20`, color: bg }}>
      {status}
    </span>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: '#94a3b8' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#dc2626' }}>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${stats.supabaseConnected ? 'text-green-400' : 'text-red-400'}`}
            style={{ background: stats.supabaseConnected ? '#22c55e20' : '#dc262620' }}>
            <span className={`w-2 h-2 rounded-full ${stats.supabaseConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {stats.supabaseConnected ? 'Database Connected' : 'Database Error'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.users} color="#60a5fa"
          icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        <StatCard label="Workspaces" value={stats.workspaces} color="#a78bfa"
          icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        <StatCard label="Content Items" value={stats.content} color="#34d399"
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <StatCard label="Total AI Calls" value={stats.aiUsage} color="#f59e0b"
          icon="M13 10V3L4 14h7v7l9-11h-7z" />
      </div>

      {/* Distribution cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workspaces by plan */}
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Workspaces by Plan</h2>
          <div className="space-y-3">
            {Object.entries(stats.workspacesByPlan).map(([plan, count]) => {
              const total = stats.workspaces || 1;
              const pct = Math.round((count / total) * 100);
              const colors: Record<string, string> = { free: '#94a3b8', pro: '#60a5fa', business: '#a78bfa' };
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize" style={{ color: colors[plan] || '#94a3b8' }}>{plan}</span>
                    <span style={{ color: '#94a3b8' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#1e293b' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[plan] || '#94a3b8' }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.workspacesByPlan).length === 0 && (
              <p className="text-sm" style={{ color: '#64748b' }}>No workspaces yet</p>
            )}
          </div>
        </div>

        {/* Content by status */}
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Content by Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.contentByStatus).map(([status, count]) => {
              const total = stats.content || 1;
              const pct = Math.round((count / total) * 100);
              const colors: Record<string, string> = { draft: '#94a3b8', review: '#f59e0b', published: '#22c55e', scheduled: '#8b5cf6', archived: '#6b7280' };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize" style={{ color: colors[status] || '#94a3b8' }}>{status}</span>
                    <span style={{ color: '#94a3b8' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#1e293b' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[status] || '#94a3b8' }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.contentByStatus).length === 0 && (
              <p className="text-sm" style={{ color: '#64748b' }}>No content yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent signups */}
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Signups</h2>
          <div className="space-y-2">
            {stats.recentSignups.map(user => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#1e293b' }}>
                <div>
                  <div className="text-sm font-medium text-white">{user.full_name || 'No name'}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{user.email}</div>
                </div>
                <div className="text-xs" style={{ color: '#64748b' }}>{formatDate(user.created_at)}</div>
              </div>
            ))}
            {stats.recentSignups.length === 0 && (
              <p className="text-sm" style={{ color: '#64748b' }}>No users yet</p>
            )}
          </div>
        </div>

        {/* Recent content */}
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Content</h2>
          <div className="space-y-2">
            {stats.recentContent.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#1e293b' }}>
                <div className="min-w-0 flex-1 mr-3">
                  <div className="text-sm font-medium text-white truncate">{item.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {statusBadge(item.status)}
                    <span className="text-xs" style={{ color: '#64748b' }}>SEO: {item.seo_score}</span>
                  </div>
                </div>
                <div className="text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{formatDate(item.created_at)}</div>
              </div>
            ))}
            {stats.recentContent.length === 0 && (
              <p className="text-sm" style={{ color: '#64748b' }}>No content yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
