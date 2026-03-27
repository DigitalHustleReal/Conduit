'use client';

import { useState, useEffect } from 'react';

interface FinanceData {
  planCounts: Record<string, number>;
  totalAiCalls: number;
  byokAiCalls: number;
  platformAiCalls: number;
  payingCustomers: Array<{
    workspace_id: string;
    workspace_name: string;
    owner_email: string;
    plan: string;
    credits_ai_calls: number;
    stripe_customer_id: string | null;
    created_at: string;
  }>;
  monthlySignups: Record<string, number>;
  monthlyPlanBreakdown: Record<string, Record<string, number>>;
  totalWorkspaces: number;
  totalUsers: number;
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 29,
  business: 99,
  byok: 0,
};

const PLAN_COLORS: Record<string, string> = {
  free: '#64748b',
  pro: '#2563eb',
  business: '#7c3aed',
  byok: '#059669',
};

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function FinanceDashboard() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/finance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load finance data');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: '#94a3b8' }}>Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <p className="text-red-400">{error || 'Failed to load data'}</p>
      </div>
    );
  }

  const mrr = (data.planCounts.pro || 0) * 29 + (data.planCounts.business || 0) * 99;
  const arr = mrr * 12;
  const paidCustomers = (data.planCounts.pro || 0) + (data.planCounts.business || 0);
  const revenuePerUser = paidCustomers > 0 ? mrr / paidCustomers : 0;

  // Revenue breakdown bars
  const planEntries = Object.entries(PLAN_PRICES).map(([plan, price]) => ({
    plan,
    count: data.planCounts[plan] || 0,
    revenue: (data.planCounts[plan] || 0) * price,
  }));
  const maxRevenue = Math.max(...planEntries.map(e => e.revenue), 1);

  // Monthly trend: last 6 months
  const now = new Date();
  const last6Months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push(d.toISOString().substring(0, 7));
  }

  // Calculate cumulative plan counts up to each month for revenue trend
  const sortedMonths = Object.keys(data.monthlyPlanBreakdown).sort();
  const cumulativePlans: Record<string, Record<string, number>> = {};
  let running = { free: 0, pro: 0, business: 0, byok: 0 };
  sortedMonths.forEach(m => {
    const bd = data.monthlyPlanBreakdown[m] || { free: 0, pro: 0, business: 0, byok: 0 };
    running = {
      free: running.free + (bd.free || 0),
      pro: running.pro + (bd.pro || 0),
      business: running.business + (bd.business || 0),
      byok: running.byok + (bd.byok || 0),
    };
    cumulativePlans[m] = { ...running };
  });

  const monthlyRevenue = last6Months.map(m => {
    // Find the latest cumulative data at or before this month
    let plans = { free: 0, pro: 0, business: 0, byok: 0 };
    for (const sm of sortedMonths) {
      if (sm <= m) plans = cumulativePlans[sm] as { free: number; pro: number; business: number; byok: number };
      else break;
    }
    return {
      month: m,
      label: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: (plans.pro || 0) * 29 + (plans.business || 0) * 99,
      signups: data.monthlySignups[m] || 0,
    };
  });
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
          <p style={{ color: '#94a3b8' }}>Financial overview and revenue metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'MRR', value: formatCurrency(mrr), sub: 'Monthly Recurring Revenue', color: '#2563eb' },
          { label: 'ARR', value: formatCurrency(arr), sub: 'Annual Recurring Revenue', color: '#7c3aed' },
          { label: 'Paid Customers', value: String(paidCustomers), sub: `${data.totalWorkspaces} total workspaces`, color: '#059669' },
          { label: 'Churn Rate', value: '0%', sub: 'No churn data yet', color: '#f59e0b' },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl border p-5"
            style={{ background: '#111827', borderColor: '#1e293b' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: card.color }} />
              <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
            <div className="text-xs" style={{ color: '#64748b' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Plan */}
        <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h2>
          <div className="space-y-4">
            {planEntries.map(entry => (
              <div key={entry.plan}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ background: PLAN_COLORS[entry.plan] }}
                    />
                    <span className="text-sm font-medium capitalize text-white">
                      {entry.plan}
                    </span>
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      ({entry.count} users)
                    </span>
                  </div>
                  <span className="text-sm font-mono text-white">
                    {formatCurrency(entry.revenue)}/mo
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${maxRevenue > 0 ? (entry.revenue / maxRevenue) * 100 : 0}%`,
                      background: PLAN_COLORS[entry.plan],
                      minWidth: entry.revenue > 0 ? '8px' : '0',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between" style={{ borderColor: '#1e293b' }}>
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>Total MRR</span>
            <span className="text-sm font-bold text-white">{formatCurrency(mrr)}</span>
          </div>
        </div>

        {/* Plan Distribution (simple CSS pie-like chart) */}
        <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
          {data.totalWorkspaces > 0 ? (
            <>
              {/* Stacked bar as pie alternative */}
              <div className="w-full h-8 rounded-lg overflow-hidden flex mb-6" style={{ background: '#1e293b' }}>
                {Object.entries(PLAN_COLORS).map(([plan, color]) => {
                  const count = data.planCounts[plan] || 0;
                  const pct = (count / data.totalWorkspaces) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={plan}
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, background: color }}
                      title={`${plan}: ${count} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PLAN_COLORS).map(([plan, color]) => {
                  const count = data.planCounts[plan] || 0;
                  const pct = data.totalWorkspaces > 0
                    ? ((count / data.totalWorkspaces) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={plan} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: color }} />
                      <span className="text-sm capitalize" style={{ color: '#94a3b8' }}>
                        {plan}: {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: '#64748b' }}>No workspace data</p>
          )}

          {/* Additional metrics */}
          <div className="mt-6 pt-4 border-t space-y-3" style={{ borderColor: '#1e293b' }}>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: '#94a3b8' }}>Revenue per User</span>
              <span className="text-sm font-mono text-white">{formatCurrency(Math.round(revenuePerUser))}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: '#94a3b8' }}>Conversion Rate</span>
              <span className="text-sm font-mono text-white">
                {data.totalWorkspaces > 0
                  ? ((paidCustomers / data.totalWorkspaces) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="rounded-xl border p-6 mb-8" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Monthly Revenue Trend</h2>
        <div className="flex items-end gap-3" style={{ height: '200px' }}>
          {monthlyRevenue.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-xs font-mono text-white mb-1">
                {m.revenue > 0 ? formatCurrency(m.revenue) : '$0'}
              </div>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${maxMonthlyRevenue > 0 ? Math.max((m.revenue / maxMonthlyRevenue) * 160, 4) : 4}px`,
                  background: 'linear-gradient(to top, #2563eb, #3b82f6)',
                }}
              />
              <div className="text-xs mt-2" style={{ color: '#64748b' }}>{m.label}</div>
              <div className="text-xs" style={{ color: '#475569' }}>{m.signups} signups</div>
            </div>
          ))}
        </div>
      </div>

      {/* Projections summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <div className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>Projected Annual (Current MRR x 12)</div>
          <div className="text-xl font-bold text-white">{formatCurrency(arr)}</div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <div className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>Next Month Estimate</div>
          <div className="text-xl font-bold text-white">{formatCurrency(Math.round(mrr * 1.1))}</div>
          <div className="text-xs" style={{ color: '#64748b' }}>Assuming 10% growth</div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: '#111827', borderColor: '#1e293b' }}>
          <div className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>AI Cost Ratio</div>
          <div className="text-xl font-bold text-white">
            {mrr > 0
              ? ((data.platformAiCalls * 0.01 / mrr) * 100).toFixed(1)
              : '0.0'}%
          </div>
          <div className="text-xs" style={{ color: '#64748b' }}>Platform AI cost / MRR</div>
        </div>
      </div>
    </div>
  );
}
