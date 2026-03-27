'use client';

import { useState, useEffect } from 'react';

interface Stats {
  tableCounts: Record<string, number>;
  envStatus: Record<string, boolean>;
  supabaseConnected: boolean;
  auditLog: Array<{
    id: string;
    action: string;
    entity_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminSystem() {
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
    return <div className="flex items-center justify-center h-64"><div style={{ color: '#94a3b8' }}>Loading system info...</div></div>;
  }
  if (error) {
    return <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#dc2626' }}><p className="text-red-400">Error: {error}</p></div>;
  }
  if (!stats) return null;

  const totalRows = Object.values(stats.tableCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">System Status</h1>

      {/* Connection status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-3">Supabase Connection</h2>
          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full ${stats.supabaseConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm" style={{ color: stats.supabaseConnected ? '#22c55e' : '#ef4444' }}>
              {stats.supabaseConnected ? 'Connected and responding' : 'Connection failed'}
            </span>
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-3">Database Size</h2>
          <div className="text-3xl font-bold text-white">{totalRows.toLocaleString()}</div>
          <div className="text-xs" style={{ color: '#64748b' }}>total rows across all tables</div>
        </div>
      </div>

      {/* Table row counts */}
      <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Database Table Counts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(stats.tableCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([table, count]) => (
              <div key={table} className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ background: '#0f172a' }}>
                <span className="text-sm font-mono" style={{ color: '#94a3b8' }}>{table}</span>
                <span className="text-sm font-bold text-white">{count.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Environment variables */}
      <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Environment Variables</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(stats.envStatus).map(([name, isSet]) => (
            <div key={name} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: '#0f172a' }}>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSet ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-mono truncate" style={{ color: isSet ? '#94a3b8' : '#ef4444' }}>{name}</span>
              <span className="ml-auto text-xs flex-shrink-0" style={{ color: isSet ? '#22c55e' : '#ef4444' }}>
                {isSet ? 'Set' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent audit log */}
      <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Audit Log</h2>
        {stats.auditLog.length > 0 ? (
          <div className="space-y-2">
            {stats.auditLog.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#1e293b' }}>
                <div>
                  <span className="text-sm text-white font-medium">{entry.action}</span>
                  {entry.entity_type && (
                    <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{ background: '#1e293b', color: '#94a3b8' }}>
                      {entry.entity_type}
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: '#64748b' }}>{formatDate(entry.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#64748b' }}>No audit log entries</p>
        )}
      </div>
    </div>
  );
}
