'use client';

import { useState, useEffect, useMemo } from 'react';

interface ContentItem {
  id: string;
  title: string;
  workspace_id: string;
  status: string;
  seo_score: number;
  ai_score: number;
  word_count: number;
  created_at: string;
  workspace_name?: string;
}

interface Workspace {
  id: string;
  name: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: '#94a3b8', review: '#f59e0b', published: '#22c55e', scheduled: '#8b5cf6', archived: '#6b7280',
  };
  const bg = colors[status] || '#94a3b8';
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ background: `${bg}20`, color: bg }}>
      {status}
    </span>
  );
}

function scoreBadge(score: number) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return <span className="font-mono text-xs" style={{ color }}>{score}</span>;
}

type SortKey = 'title' | 'status' | 'seo_score' | 'ai_score' | 'created_at';

export default function AdminContent() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    Promise.all([
      fetch('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/admin/workspaces', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([contentData, wsData]) => {
        if (contentData.error) throw new Error(contentData.error);
        setContent(contentData.content || []);
        setWorkspaces((wsData.workspaces || []).map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let result = content.map(c => ({
      ...c,
      workspace_name: workspaces.find(w => w.id === c.workspace_id)?.name || c.workspace_id?.slice(0, 8),
    }));
    if (statusFilter) {
      result = result.filter(c => c.status === statusFilter);
    }
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortKey) {
        case 'title': valA = a.title; valB = b.title; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'seo_score': valA = a.seo_score || 0; valB = b.seo_score || 0; break;
        case 'ai_score': valA = a.ai_score || 0; valB = b.ai_score || 0; break;
        case 'created_at': valA = a.created_at; valB = b.created_at; break;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    return result;
  }, [content, workspaces, statusFilter, sortKey, sortAsc]);

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
    return <div className="flex items-center justify-center h-64"><div style={{ color: '#94a3b8' }}>Loading content...</div></div>;
  }
  if (error) {
    return <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#dc2626' }}><p className="text-red-400">Error: {error}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Content ({content.length})</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'draft', 'review', 'published', 'scheduled', 'archived'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize"
            style={{
              background: statusFilter === status ? '#2563eb' : '#1e293b',
              color: statusFilter === status ? '#fff' : '#94a3b8',
              border: '1px solid',
              borderColor: statusFilter === status ? '#2563eb' : '#334155',
            }}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#0f172a' }}>
              <tr>
                <SortHeader label="Title" field="title" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Workspace</th>
                <SortHeader label="Status" field="status" />
                <SortHeader label="SEO" field="seo_score" />
                <SortHeader label="AI" field="ai_score" />
                <SortHeader label="Created" field="created_at" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#1e293b' }}>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderColor: '#1e293b' }}>
                  <td className="px-4 py-3 text-sm text-white font-medium max-w-xs truncate">{item.title}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#cbd5e1' }}>{item.workspace_name}</td>
                  <td className="px-4 py-3 text-sm">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-sm">{scoreBadge(item.seo_score)}</td>
                  <td className="px-4 py-3 text-sm">{scoreBadge(item.ai_score)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>{formatDate(item.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#64748b' }}>No content found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
