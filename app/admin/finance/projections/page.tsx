'use client';

import { useState, useEffect, useMemo } from 'react';

interface FinanceData {
  planCounts: Record<string, number>;
  totalWorkspaces: number;
  totalUsers: number;
}

const PLAN_PRICES: Record<string, number> = { pro: 29, business: 99 };

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ProjectionsPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Projection inputs
  const [monthlySignups, setMonthlySignups] = useState(50);
  const [freeToProRate, setFreeToProRate] = useState(10);
  const [proToBusinessRate, setProToBusinessRate] = useState(5);
  const [churnRate, setChurnRate] = useState(3);
  const [monthlyExpenses, setMonthlyExpenses] = useState(45);

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/finance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Try to load infra costs from localStorage for default expenses
    try {
      const stored = localStorage.getItem('conduit-admin-infra-costs');
      if (stored) {
        const infra = JSON.parse(stored);
        const total = (infra.vercel || 0) + (infra.supabase || 0) + ((infra.domain || 0) / 12);
        if (total > 0) setMonthlyExpenses(Math.round(total));
      }
    } catch { /* ignore */ }
  }, []);

  const currentFree = data?.planCounts?.free || 0;
  const currentPro = data?.planCounts?.pro || 0;
  const currentBusiness = data?.planCounts?.business || 0;
  const currentByok = data?.planCounts?.byok || 0;
  const totalPaid = currentPro + currentBusiness;
  const totalWorkspaces = data?.totalWorkspaces || 0;
  const currentMRR = currentPro * 29 + currentBusiness * 99;
  const conversionRate = totalWorkspaces > 0 ? (totalPaid / totalWorkspaces * 100) : 0;

  // 12-month projection
  const projections = useMemo(() => {
    const rows: Array<{
      month: number;
      label: string;
      totalUsers: number;
      free: number;
      pro: number;
      business: number;
      mrr: number;
      cumRevenue: number;
      breakEven: boolean;
    }> = [];

    let free = currentFree + currentByok;
    let pro = currentPro;
    let business = currentBusiness;
    let cumRevenue = 0;
    let hitBreakEven = false;

    for (let m = 1; m <= 12; m++) {
      const now = new Date();
      const future = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const label = future.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // New signups go to free
      free += monthlySignups;

      // Conversions
      const newPro = Math.round(free * (freeToProRate / 100));
      const newBusiness = Math.round(pro * (proToBusinessRate / 100));

      free -= newPro;
      pro += newPro - newBusiness;
      business += newBusiness;

      // Churn (from paid plans)
      const proChurn = Math.round(pro * (churnRate / 100));
      const bizChurn = Math.round(business * (churnRate / 100));
      pro = Math.max(0, pro - proChurn);
      business = Math.max(0, business - bizChurn);
      free += proChurn + bizChurn; // churned users go back to free

      const mrr = pro * 29 + business * 99;
      cumRevenue += mrr;

      const net = mrr - monthlyExpenses;
      if (!hitBreakEven && net >= 0) hitBreakEven = true;

      rows.push({
        month: m,
        label,
        totalUsers: free + pro + business,
        free,
        pro,
        business,
        mrr,
        cumRevenue,
        breakEven: hitBreakEven && net >= 0 && (rows.length === 0 || !rows[rows.length - 1].breakEven),
      });
    }

    return rows;
  }, [currentFree, currentPro, currentBusiness, currentByok, monthlySignups, freeToProRate, proToBusinessRate, churnRate, monthlyExpenses]);

  // Find break-even month
  const breakEvenMonth = projections.find(p => p.mrr >= monthlyExpenses);

  const inputStyle = {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: '#94a3b8' }}>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Growth Projections</h1>
        <p style={{ color: '#94a3b8' }}>Model your growth over the next 12 months</p>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: String(totalWorkspaces) },
          { label: 'Paid Users', value: String(totalPaid) },
          { label: 'MRR', value: formatCurrency(currentMRR) },
          { label: 'Conversion Rate', value: conversionRate.toFixed(1) + '%' },
        ].map(m => (
          <div key={m.label} className="rounded-xl border p-4" style={{ background: '#111827', borderColor: '#1e293b' }}>
            <div className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>{m.label}</div>
            <div className="text-xl font-bold text-white">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Projection Inputs */}
      <div className="rounded-xl border p-6 mb-8" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Projection Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Monthly New Signups</label>
            <input
              type="number"
              min="0"
              value={monthlySignups}
              onChange={e => setMonthlySignups(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Free to Pro (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={freeToProRate}
              onChange={e => setFreeToProRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Pro to Business (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={proToBusinessRate}
              onChange={e => setProToBusinessRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Monthly Churn (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={churnRate}
              onChange={e => setChurnRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Monthly Expenses ($)</label>
            <input
              type="number"
              min="0"
              value={monthlyExpenses}
              onChange={e => setMonthlyExpenses(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Break-even indicator */}
      <div
        className="rounded-xl border p-5 mb-8 flex items-center gap-4"
        style={{
          background: breakEvenMonth ? '#05966922' : '#111827',
          borderColor: breakEvenMonth ? '#059669' : '#1e293b',
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: breakEvenMonth ? '#059669' : '#334155' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <div className="text-white font-medium">
            {breakEvenMonth
              ? `Break-even projected in Month ${breakEvenMonth.month} (${breakEvenMonth.label})`
              : 'Break-even not reached within 12 months at current projections'}
          </div>
          <div className="text-sm" style={{ color: '#94a3b8' }}>
            {breakEvenMonth
              ? `MRR of ${formatCurrency(breakEvenMonth.mrr)} covers ${formatCurrency(monthlyExpenses)} monthly expenses`
              : `Increase conversion rates or signups, or reduce expenses (${formatCurrency(monthlyExpenses)}/mo)`}
          </div>
        </div>
      </div>

      {/* Projection Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: '#64748b' }}>Month</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>Total Users</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>Free</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>Pro</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>Business</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>MRR</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>Net</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: '#64748b' }}>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {projections.map(p => {
                const net = p.mrr - monthlyExpenses;
                return (
                  <tr
                    key={p.month}
                    className="border-t"
                    style={{
                      borderColor: '#1e293b',
                      background: p.breakEven ? '#05966915' : undefined,
                    }}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {p.label}
                      {p.breakEven && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: '#059669', color: '#fff' }}>
                          Break-even
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{p.totalUsers.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#94a3b8' }}>{p.free.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#60a5fa' }}>{p.pro.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#a78bfa' }}>{p.business.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(p.mrr)}</td>
                    <td
                      className="px-4 py-3 text-right font-mono"
                      style={{ color: net >= 0 ? '#34d399' : '#f87171' }}
                    >
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(p.cumRevenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MRR Growth Bar Chart */}
      <div className="rounded-xl border p-6 mt-8" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Projected MRR Growth</h2>
        <div className="flex items-end gap-2" style={{ height: '180px' }}>
          {projections.map(p => {
            const maxMRR = Math.max(...projections.map(x => x.mrr), 1);
            return (
              <div key={p.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-xs font-mono text-white mb-1">
                  {formatCurrency(p.mrr)}
                </div>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max((p.mrr / maxMRR) * 140, 4)}px`,
                    background: p.mrr >= monthlyExpenses
                      ? 'linear-gradient(to top, #059669, #34d399)'
                      : 'linear-gradient(to top, #2563eb, #3b82f6)',
                  }}
                />
                <div className="text-xs mt-1" style={{ color: '#64748b' }}>M{p.month}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: '#1e293b' }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: '#2563eb' }} />
            <span className="text-xs" style={{ color: '#94a3b8' }}>Below break-even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: '#059669' }} />
            <span className="text-xs" style={{ color: '#94a3b8' }}>Above break-even</span>
          </div>
        </div>
      </div>
    </div>
  );
}
