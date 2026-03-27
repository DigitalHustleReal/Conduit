'use client';

import { useState, useEffect, useMemo } from 'react';

interface Customer {
  workspace_id: string;
  workspace_name: string;
  owner_email: string;
  owner_name: string;
  plan: string;
  credits_ai_calls: number;
  stripe_customer_id: string | null;
  created_at: string;
}

const PLAN_PRICES: Record<string, number> = { pro: 29, business: 99 };

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function monthsBetween(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

type SortKey = 'revenue' | 'date' | 'usage' | 'ltv';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/finance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setCustomers(d.payingCustomers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...customers];

    if (planFilter !== 'all') {
      list = list.filter(c => c.plan.toLowerCase() === planFilter);
    }

    list.sort((a, b) => {
      let va = 0, vb = 0;
      const priceA = PLAN_PRICES[a.plan.toLowerCase()] || 0;
      const priceB = PLAN_PRICES[b.plan.toLowerCase()] || 0;

      switch (sortBy) {
        case 'revenue':
          va = priceA;
          vb = priceB;
          break;
        case 'date':
          va = new Date(a.created_at).getTime();
          vb = new Date(b.created_at).getTime();
          break;
        case 'usage':
          va = a.credits_ai_calls;
          vb = b.credits_ai_calls;
          break;
        case 'ltv':
          va = monthsBetween(a.created_at) * priceA;
          vb = monthsBetween(b.created_at) * priceB;
          break;
      }
      return sortAsc ? va - vb : vb - va;
    });

    return list;
  }, [customers, planFilter, sortBy, sortAsc]);

  const totalMRR = customers.reduce(
    (sum, c) => sum + (PLAN_PRICES[c.plan.toLowerCase()] || 0),
    0
  );

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortBy !== key) return '';
    return sortAsc ? ' ^' : ' v';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: '#94a3b8' }}>Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p style={{ color: '#94a3b8' }}>
            {customers.length} paying customer{customers.length !== 1 ? 's' : ''} &middot; {formatCurrency(totalMRR)} MRR
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm" style={{ color: '#94a3b8' }}>Filter:</span>
        {['all', 'pro', 'business'].map(plan => (
          <button
            key={plan}
            onClick={() => setPlanFilter(plan)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize"
            style={{
              background: planFilter === plan ? '#2563eb' : '#1e293b',
              color: planFilter === plan ? '#fff' : '#94a3b8',
            }}
          >
            {plan === 'all' ? 'All Plans' : plan}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1e293b' }}>
        {filtered.length === 0 ? (
          <div className="p-12 text-center" style={{ color: '#64748b' }}>
            No paying customers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#64748b' }}>Workspace</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#64748b' }}>Owner</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#64748b' }}>Plan</th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer select-none"
                    style={{ color: '#64748b' }}
                    onClick={() => handleSort('revenue')}
                  >
                    Revenue{sortIcon('revenue')}
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer select-none"
                    style={{ color: '#64748b' }}
                    onClick={() => handleSort('date')}
                  >
                    Since{sortIcon('date')}
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer select-none"
                    style={{ color: '#64748b' }}
                    onClick={() => handleSort('usage')}
                  >
                    AI Calls{sortIcon('usage')}
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer select-none"
                    style={{ color: '#64748b' }}
                    onClick={() => handleSort('ltv')}
                  >
                    LTV{sortIcon('ltv')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#64748b' }}>Stripe ID</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#64748b' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const price = PLAN_PRICES[c.plan.toLowerCase()] || 0;
                  const months = monthsBetween(c.created_at);
                  const ltv = months * price;
                  return (
                    <tr key={c.workspace_id} className="border-t" style={{ borderColor: '#1e293b' }}>
                      <td className="px-4 py-3 text-white font-medium">{c.workspace_name}</td>
                      <td className="px-4 py-3">
                        <div className="text-white text-sm">{c.owner_name}</div>
                        <div className="text-xs" style={{ color: '#64748b' }}>{c.owner_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium uppercase"
                          style={{
                            background: c.plan.toLowerCase() === 'business' ? '#7c3aed22' : '#2563eb22',
                            color: c.plan.toLowerCase() === 'business' ? '#a78bfa' : '#60a5fa',
                          }}
                        >
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(price)}/mo</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#94a3b8' }}>
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">{c.credits_ai_calls.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(ltv)}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: '#64748b' }}>
                        {c.stripe_customer_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`mailto:${c.owner_email}`}
                          className="inline-block px-3 py-1 rounded text-xs font-medium transition-colors"
                          style={{ background: '#1e293b', color: '#60a5fa' }}
                        >
                          Contact
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
