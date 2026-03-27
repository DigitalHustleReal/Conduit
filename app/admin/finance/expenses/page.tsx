'use client';

import { useState, useEffect, useCallback } from 'react';

interface FinanceData {
  totalAiCalls: number;
  byokAiCalls: number;
  platformAiCalls: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface InfraCosts {
  vercel: number;
  supabase: number;
  domain: number;
}

const CATEGORIES = ['infra', 'ai', 'marketing', 'other'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  infra: '#2563eb',
  ai: '#7c3aed',
  marketing: '#059669',
  other: '#f59e0b',
};

const LS_EXPENSES_KEY = 'conduit-admin-expenses';
const LS_INFRA_KEY = 'conduit-admin-infra-costs';

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExpensesPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [infra, setInfra] = useState<InfraCosts>({ vercel: 0, supabase: 0, domain: 10 });

  // Form state
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('infra');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Load expenses + infra from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_EXPENSES_KEY);
      if (stored) setExpenses(JSON.parse(stored));
    } catch { /* ignore */ }
    try {
      const stored = localStorage.getItem(LS_INFRA_KEY);
      if (stored) setInfra(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Fetch AI data
  useEffect(() => {
    const token = localStorage.getItem('conduit-admin-auth') || '';
    fetch('/api/admin/finance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveExpenses = useCallback((list: Expense[]) => {
    setExpenses(list);
    localStorage.setItem(LS_EXPENSES_KEY, JSON.stringify(list));
  }, []);

  const saveInfra = useCallback((costs: InfraCosts) => {
    setInfra(costs);
    localStorage.setItem(LS_INFRA_KEY, JSON.stringify(costs));
  }, []);

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !amount) return;
    const newExpense: Expense = {
      id: Date.now().toString(36),
      description: desc.trim(),
      amount: parseFloat(amount),
      category,
      date,
    };
    saveExpenses([newExpense, ...expenses]);
    setDesc('');
    setAmount('');
  };

  const removeExpense = (id: string) => {
    saveExpenses(expenses.filter(e => e.id !== id));
  };

  const aiCostPerCall = 0.01;
  const platformAiCalls = data?.platformAiCalls || 0;
  const estimatedAiCost = platformAiCalls * aiCostPerCall;
  const monthlyDomain = infra.domain / 12;
  const totalMonthlyBurn = infra.vercel + infra.supabase + monthlyDomain + estimatedAiCost;

  // Monthly expense totals
  const monthlyExpenseTotals: Record<string, number> = {};
  expenses.forEach(exp => {
    const month = exp.date.substring(0, 7);
    monthlyExpenseTotals[month] = (monthlyExpenseTotals[month] || 0) + exp.amount;
  });

  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthExpenses = monthlyExpenseTotals[currentMonth] || 0;

  const inputStyle = {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Expense Tracking</h1>
        <p style={{ color: '#94a3b8' }}>AI costs, infrastructure, and operational expenses</p>
      </div>

      {/* AI Cost Calculator */}
      <div className="rounded-xl border p-6 mb-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">AI Cost Calculator</h2>
        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-4" style={{ background: '#1e293b' }}>
              <div className="text-sm" style={{ color: '#94a3b8' }}>Total AI Calls</div>
              <div className="text-xl font-bold text-white">{(data?.totalAiCalls || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#1e293b' }}>
              <div className="text-sm" style={{ color: '#94a3b8' }}>Platform Calls (your cost)</div>
              <div className="text-xl font-bold text-white">{platformAiCalls.toLocaleString()}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>
                Est. cost: {formatCurrency(estimatedAiCost)} @ {formatCurrency(aiCostPerCall)}/call
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#1e293b' }}>
              <div className="text-sm" style={{ color: '#94a3b8' }}>BYOK Calls ($0 cost to you)</div>
              <div className="text-xl font-bold text-white">{(data?.byokAiCalls || 0).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Infrastructure Costs */}
      <div className="rounded-xl border p-6 mb-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Infrastructure Costs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Vercel ($/mo)</label>
            <input
              type="number"
              min="0"
              value={infra.vercel}
              onChange={e => saveInfra({ ...infra, vercel: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
            <div className="text-xs mt-1" style={{ color: '#64748b' }}>$0 Hobby / $20 Pro</div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Supabase ($/mo)</label>
            <input
              type="number"
              min="0"
              value={infra.supabase}
              onChange={e => saveInfra({ ...infra, supabase: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
            <div className="text-xs mt-1" style={{ color: '#64748b' }}>$0 Free / $25 Pro</div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Domain ($/year)</label>
            <input
              type="number"
              min="0"
              value={infra.domain}
              onChange={e => saveInfra({ ...infra, domain: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
            <div className="text-xs mt-1" style={{ color: '#64748b' }}>~$10/year typical</div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Anthropic API (calculated)</label>
            <div className="px-3 py-2 rounded-lg text-sm" style={{ background: '#1e293b', color: '#e2e8f0' }}>
              {formatCurrency(estimatedAiCost)}
            </div>
            <div className="text-xs mt-1" style={{ color: '#64748b' }}>From AI usage above</div>
          </div>
        </div>
        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
          <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>Total Monthly Burn</span>
          <span className="text-xl font-bold text-white">{formatCurrency(totalMonthlyBurn)}</span>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="rounded-xl border p-6 mb-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Add Expense</h2>
        <form onSubmit={addExpense} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Description</label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Vercel Pro upgrade"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
              style={inputStyle}
              required
            />
          </div>
          <div className="w-28">
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
              style={inputStyle}
              required
            />
          </div>
          <div className="w-36">
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2563eb' }}
          >
            Add
          </button>
        </form>
      </div>

      {/* Expense List */}
      <div className="rounded-xl border p-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Expenses</h2>
          <div className="text-sm" style={{ color: '#94a3b8' }}>
            This month: <span className="font-mono text-white">{formatCurrency(currentMonthExpenses)}</span>
          </div>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: '#64748b' }}>
            No expenses recorded yet. Add one above.
          </p>
        ) : (
          <>
            {/* Monthly totals summary */}
            {Object.keys(monthlyExpenseTotals).length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b" style={{ borderColor: '#1e293b' }}>
                {Object.entries(monthlyExpenseTotals)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 6)
                  .map(([month, total]) => (
                    <div
                      key={month}
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{ background: '#1e293b' }}
                    >
                      <span style={{ color: '#94a3b8' }}>{month}: </span>
                      <span className="font-mono text-white">{formatCurrency(total)}</span>
                    </div>
                  ))}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: '#64748b' }}>
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Description</th>
                  <th className="text-left py-2 font-medium">Category</th>
                  <th className="text-right py-2 font-medium">Amount</th>
                  <th className="text-right py-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} className="border-t" style={{ borderColor: '#1e293b' }}>
                    <td className="py-2 font-mono" style={{ color: '#94a3b8' }}>{exp.date}</td>
                    <td className="py-2 text-white">{exp.description}</td>
                    <td className="py-2">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: CATEGORY_COLORS[exp.category] + '22', color: CATEGORY_COLORS[exp.category] }}
                      >
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-white">{formatCurrency(exp.amount)}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => removeExpense(exp.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
