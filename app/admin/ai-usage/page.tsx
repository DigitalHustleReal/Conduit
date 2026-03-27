'use client';

import { useState, useEffect } from 'react';

interface Workspace {
  id: string;
  name: string;
  plan: string;
  credits_ai_calls: number;
  credits_ai_limit: number;
  owner: { email: string; full_name: string } | null;
}

function planBadge(plan: string) {
  const colors: Record<string, string> = { free: '#94a3b8', pro: '#60a5fa', business: '#a78bfa' };
  const bg = colors[plan] || '#94a3b8';
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ background: `${bg}20`, color: bg }}>
      {plan}
    </span>
  );
}

export default function AdminAIUsage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setWorkspaces(data.workspaces || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div style={{ color: '#94a3b8' }}>Loading AI usage...</div></div>;
  }
  if (error) {
    return <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#dc2626' }}><p className="text-red-400">Error: {error}</p></div>;
  }

  const totalCalls = workspaces.reduce((sum, w) => sum + (w.credits_ai_calls || 0), 0);
  const totalLimit = workspaces.reduce((sum, w) => sum + (w.credits_ai_limit || 0), 0);

  // Usage by plan
  const byPlan: Record<string, { calls: number; limit: number; count: number }> = {};
  workspaces.forEach(w => {
    if (!byPlan[w.plan]) byPlan[w.plan] = { calls: 0, limit: 0, count: 0 };
    byPlan[w.plan].calls += w.credits_ai_calls || 0;
    byPlan[w.plan].limit += w.credits_ai_limit || 0;
    byPlan[w.plan].count += 1;
  });

  // Top 10 by usage
  const top10 = [...workspaces]
    .sort((a, b) => (b.credits_ai_calls || 0) - (a.credits_ai_calls || 0))
    .slice(0, 10);

  const maxCalls = top10.length > 0 ? (top10[0].credits_ai_calls || 1) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">AI Usage Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <div className="text-sm mb-1" style={{ color: '#94a3b8' }}>Total AI Calls</div>
          <div className="text-3xl font-bold text-white">{totalCalls.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>across all workspaces</div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <div className="text-sm mb-1" style={{ color: '#94a3b8' }}>Total Credits Available</div>
          <div className="text-3xl font-bold text-white">{totalLimit.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>total limit across plans</div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <div className="text-sm mb-1" style={{ color: '#94a3b8' }}>Utilization Rate</div>
          <div className="text-3xl font-bold text-white">
            {totalLimit > 0 ? Math.round((totalCalls / totalLimit) * 100) : 0}%
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748b' }}>calls used / total limit</div>
        </div>
      </div>

      {/* Usage by plan */}
      <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Usage by Plan Tier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['free', 'pro', 'business'] as const).map(plan => {
            const data = byPlan[plan] || { calls: 0, limit: 0, count: 0 };
            const pct = data.limit > 0 ? Math.round((data.calls / data.limit) * 100) : 0;
            const colors: Record<string, string> = { free: '#94a3b8', pro: '#60a5fa', business: '#a78bfa' };
            return (
              <div key={plan} className="rounded-lg p-4" style={{ background: '#0f172a' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize" style={{ color: colors[plan] }}>{plan}</span>
                  <span className="text-xs" style={{ color: '#64748b' }}>{data.count} workspaces</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{data.calls.toLocaleString()}</div>
                <div className="text-xs mb-2" style={{ color: '#64748b' }}>of {data.limit.toLocaleString()} credits</div>
                <div className="h-2 rounded-full" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: colors[plan] }} />
                </div>
                <div className="text-xs text-right mt-1" style={{ color: '#64748b' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 10 workspaces by usage */}
      <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Top 10 Workspaces by AI Usage</h2>
        <div className="space-y-3">
          {top10.map((ws, i) => {
            const pct = maxCalls > 0 ? Math.round((ws.credits_ai_calls / maxCalls) * 100) : 0;
            return (
              <div key={ws.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs w-5 text-right" style={{ color: '#64748b' }}>{i + 1}.</span>
                    <span className="text-white font-medium">{ws.name}</span>
                    {planBadge(ws.plan)}
                  </div>
                  <span style={{ color: '#94a3b8' }}>
                    {ws.credits_ai_calls.toLocaleString()} / {ws.credits_ai_limit.toLocaleString()}
                  </span>
                </div>
                <div className="ml-7 h-2 rounded-full" style={{ background: '#1e293b' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#60a5fa' }} />
                </div>
              </div>
            );
          })}
          {top10.length === 0 && (
            <p className="text-sm" style={{ color: '#64748b' }}>No workspace usage data</p>
          )}
        </div>
      </div>
    </div>
  );
}
