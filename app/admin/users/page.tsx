'use client';

import { useState, useEffect, useMemo } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  workspace: {
    id: string;
    name: string;
    plan: string;
    credits_ai_calls: number;
    credits_ai_limit: number;
  } | null;
  workspaceCount: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
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

type SortKey = 'email' | 'full_name' | 'plan' | 'ai_calls' | 'created_at';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setUsers(data.users);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortKey) {
        case 'email': valA = a.email || ''; valB = b.email || ''; break;
        case 'full_name': valA = a.full_name || ''; valB = b.full_name || ''; break;
        case 'plan': valA = a.workspace?.plan || ''; valB = b.workspace?.plan || ''; break;
        case 'ai_calls': valA = a.workspace?.credits_ai_calls || 0; valB = b.workspace?.credits_ai_calls || 0; break;
        case 'created_at': valA = a.created_at; valB = b.created_at; break;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return result;
  }, [users, search, sortKey, sortAsc]);

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
    return <div className="flex items-center justify-center h-64"><div style={{ color: '#94a3b8' }}>Loading users...</div></div>;
  }
  if (error) {
    return <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#dc2626' }}><p className="text-red-400">Error: {error}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Users ({users.length})</h1>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: '#1e293b', border: '1px solid #334155' }}
        />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#0f172a' }}>
              <tr>
                <SortHeader label="Email" field="email" />
                <SortHeader label="Name" field="full_name" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Workspace</th>
                <SortHeader label="Plan" field="plan" />
                <SortHeader label="AI Calls" field="ai_calls" />
                <SortHeader label="Joined" field="created_at" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#1e293b' }}>
              {filtered.map(user => (
                <tr
                  key={user.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderColor: '#1e293b' }}
                  onClick={() => setSelectedUser(user)}
                  onMouseOver={e => (e.currentTarget.style.background = '#1e293b')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3 text-sm text-white">{user.email || '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>{user.full_name || '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>{user.workspace?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{user.workspace ? planBadge(user.workspace.plan) : '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>
                    {user.workspace ? `${user.workspace.credits_ai_calls} / ${user.workspace.credits_ai_limit}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>{formatDate(user.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#64748b' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedUser(null)}>
          <div className="rounded-xl border p-6 max-w-lg w-full mx-4" style={{ background: '#111827', borderColor: '#1e293b' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">User Details</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <dl className="space-y-3">
              {[
                ['Email', selectedUser.email],
                ['Name', selectedUser.full_name || '-'],
                ['User ID', selectedUser.id],
                ['Workspace', selectedUser.workspace?.name || 'None'],
                ['Plan', selectedUser.workspace?.plan || '-'],
                ['AI Calls', selectedUser.workspace ? `${selectedUser.workspace.credits_ai_calls} / ${selectedUser.workspace.credits_ai_limit}` : '-'],
                ['Workspaces', String(selectedUser.workspaceCount)],
                ['Joined', formatDate(selectedUser.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm" style={{ color: '#94a3b8' }}>{label}</dt>
                  <dd className="text-sm text-white font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
