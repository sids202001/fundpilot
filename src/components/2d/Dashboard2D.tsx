'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { PiggyBank, TrendingUp, Wallet, ArrowRight } from 'lucide-react';

export function Dashboard2D({
  onSelectCategory,
  onSelectFund,
  onSelectHolding,
}: {
  onSelectCategory: (cat: string) => void;
  onSelectFund: (fundId: string) => void;
  onSelectHolding: (ticker: string) => void;
}) {
  const { totalNetWorthCents, totalFundsCents, totalPortfolioCents, settings, expenses, funds, holdings, quotes } = useStore();

  // 1. Net Worth Breakdown
  const netWorthData = [
    { name: 'Bank Cash', value: settings.bankCashCents / 100, color: '#38bdf8' },
    { name: 'Sinking Funds', value: totalFundsCents / 100, color: '#2dd4bf' },
    { name: 'Portfolio Value', value: totalPortfolioCents / 100, color: '#a855f7' },
  ];

  // 2. Monthly Spending by Category
  const currentMonth = new Date().toISOString().substring(0, 7);
  const categoryMap = new Map<string, number>();
  expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .forEach((e) => {
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amountCents / 100);
    });

  const spendingData = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Portfolio Allocation
  const portfolioData = holdings.map((h) => {
    const spot = quotes[h.ticker]?.price || 0;
    const value = h.shares * spot;
    return {
      ticker: h.ticker,
      value: Math.round(value * 100) / 100,
    };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Net Worth 2D Composition */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Net Worth Composition</h3>
            <p className="text-xs text-slate-400">Total Net Worth: ${(totalNetWorthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-300 border border-teal-500/20">
            2D Verified
          </span>
        </div>

        {/* 4 Buckets Separation Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div>
            <span className="text-slate-400">1. Bank Cash:</span> <span className="font-semibold text-sky-400">${(settings.bankCashCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-400">2. Sinking Funds:</span> <span className="font-semibold text-teal-400">${(totalFundsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-400">3. Portfolio Value:</span> <span className="font-semibold text-purple-400">${(totalPortfolioCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-400">4. Credit Card Owed:</span> <span className="font-semibold text-rose-400">-${(settings.creditCardOwedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="h-64 w-full">
          {totalNetWorthCents > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={netWorthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {netWorthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Balance']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                />
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-slate-300">
                      {value}: ${(entry.payload.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-slate-500">
              <p>$0.00 Total Net Worth</p>
              <p className="mt-1 text-[11px]">Add bank cash, funds, or holdings to populate</p>
            </div>
          )}
        </div>
      </div>

      {/* Spending by Category 2D Bar Skyline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Monthly Spending Breakdown</h3>
            <p className="text-xs text-slate-400">Current calendar month expenditures</p>
          </div>
          <span className="text-xs text-slate-400">{spendingData.length} Categories</span>
        </div>

        <div className="h-64 w-full">
          {spendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" tickFormatter={(v) => `$${v}`} stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={11} width={110} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#14b8a6" radius={[0, 4, 4, 0]} onClick={(data) => onSelectCategory(data.category)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-slate-500">
              <p>No expenses recorded this month</p>
            </div>
          )}
        </div>
      </div>

      {/* Sinking Funds Progress List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Sinking Funds Progress</h3>
          <span className="text-xs text-slate-400">{funds.length} Active Funds</span>
        </div>

        {funds.length > 0 ? (
          <div className="space-y-3">
            {funds.map((f) => {
              const pct = f.targetAmountCents > 0 ? Math.min(100, Math.round((f.currentAmountCents / f.targetAmountCents) * 100)) : 0;
              return (
                <div
                  key={f.id}
                  onClick={() => onSelectFund(f.id)}
                  className="cursor-pointer rounded-xl border border-slate-800 bg-slate-800/30 p-3 hover:border-teal-500/40 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{f.name}</span>
                    <span className="text-teal-400 font-medium">
                      ${(f.currentAmountCents / 100).toLocaleString()} / ${(f.targetAmountCents / 100).toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No sinking funds created yet.
          </div>
        )}
      </div>

      {/* Portfolio Allocation 2D List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Portfolio Holdings</h3>
          <span className="text-xs text-slate-400">{holdings.length} Assets</span>
        </div>

        {portfolioData.length > 0 ? (
          <div className="space-y-2">
            {portfolioData.slice(0, 6).map((item) => {
              const totalVal = totalPortfolioCents / 100;
              const sharePct = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;
              return (
                <div
                  key={item.ticker}
                  onClick={() => onSelectHolding(item.ticker)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-800/30 p-2.5 hover:border-purple-500/40 hover:bg-slate-800/60 transition-all text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.ticker}</span>
                    <span className="text-[11px] text-slate-400">({sharePct}% of portfolio)</span>
                  </div>
                  <div className="font-semibold text-purple-300">
                    ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No portfolio holdings added yet.
          </div>
        )}
      </div>
    </div>
  );
}
