'use client';

import { useState, useEffect, useMemo } from 'react';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  credits_ai_calls: number;
  credits_ai_limit: number;
  stripe_customer_id: string | null;
  domain: string | null;
  created_at: string;
  owner: { email: string; full_name: string } | null;
  contentCount: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

type SortKey = 'name' | 'plan' | 'ai_calls' | 'contentCount' | 'created_at';

export default function AdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    const params = planFilter ? `?plan=${planFilter}` : '';
    fetch(`/api/admin/workspaces${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setWorkspaces(data.workspaces);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [planFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    const result = [...workspaces];
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortKey) {
        case 'name': valA = a.name; valB = b.name; break;
        case 'plan': valA = a.plan; valB = b.plan; break;
        case 'ai_calls': valA = a.credits_ai_calls || 0; valB = b.credits_ai_calls || 0; break;
        case 'contentCount': valA = a.contentCount; valB = b.contentCount; break;
        case 'created_at': valA = a.created_at; valB = b.created_at; break;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    return result;
  }, [workspaces, sortKey, sortAsc]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none"
      style={{ color: '#94a3b8' }}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && <span>{sortAsc ? '\u2191' : '\u2193'}</span>}
      </span>
    </th>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div style={{ color: '#94a3b8' }}>Loading workspaces...</div></div>;
  }
  if (error) {
    return <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#dc2626' }}><p className="text-red-400">Error: {error}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Workspaces ({workspaces.length})</h1>
      </div>

      {/* Filter by plan */}
      <div className="flex gap-2">
        {['', 'free', 'pro', 'business'].map(plan => (
          <button
            key={plan}
            onClick={() => { setPlanFilter(plan); setLoading(true); }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize"
            style={{
              background: planFilter === plan ? '#2563eb' : '#1e293b',
              color: planFilter === plan ? '#fff' : '#94a3b8',
              border: '1px solid',
              borderColor: planFilter === plan ? '#2563eb' : '#334155',
            }}
          >
            {plan || 'All Plans'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#0f172a' }}>
              <tr>
                <SortHeader label="Name" field="name" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Owner</th>
                <SortHeader label="Plan" field="plan" />
                <SortHeader label="AI Calls" field="ai_calls" />
                <SortHeader label="Content" field="contentCount" />
                <SortHeader label="Created" field="created_at" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#1e293b' }}>
              {sorted.map(ws => (
                <tr key={ws.id} style={{ borderColor: '#1e293b' }}>
                  <td className="px-4 py-3 text-sm text-white font-medium">{ws.name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>
                    {ws.owner?.email || '-'}
                    {ws.owner?.full_name && <div className="text-xs" style={{ color: '#64748b' }}>{ws.owner.full_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">{planBadge(ws.plan)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>
                    {ws.credits_ai_calls} / {ws.credits_ai_limit}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>{ws.contentCount}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>{formatDate(ws.created_at)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#64748b' }}>No workspaces found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
