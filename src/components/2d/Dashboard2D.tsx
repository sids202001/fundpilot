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
    { name: 'Bank Cash', value: settings.bankCashCents / 100, color: '#e5c07b' },
    { name: 'Sinking Funds', value: totalFundsCents / 100, color: '#d4af37' },
    { name: 'Portfolio Value', value: totalPortfolioCents / 100, color: '#b8b2a7' },
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
      <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#f5f3ef]">Net Worth Composition</h3>
            <p className="text-xs text-[#9e9a93]">Total Net Worth: ${(totalNetWorthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <span className="rounded bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold-light border border-gold/30">
            2D Verified
          </span>
        </div>

        {/* 4 Buckets Separation Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 p-3 rounded-xl bg-[#0b0d10]/90 border border-[#262930]">
          <div>
            <span className="text-[#9e9a93]">1. Bank Cash:</span> <span className="font-semibold text-gold-light">${(settings.bankCashCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[#9e9a93]">2. Sinking Funds:</span> <span className="font-semibold text-gold">${(totalFundsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[#9e9a93]">3. Portfolio Value:</span> <span className="font-semibold text-[#c8c4bc]">${(totalPortfolioCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[#9e9a93]">4. Credit Card Owed:</span> <span className="font-semibold text-loss">-${(settings.creditCardOwedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                  contentStyle={{ backgroundColor: '#111419', borderColor: '#2a2418', borderRadius: '0.75rem', color: '#f5f3ef' }}
                />
                <Legend
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-[#9e9a93]">
                      {value}: ${(entry.payload.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-[#9e9a93]">
              <p>$0.00 Total Net Worth</p>
              <p className="mt-1 text-[11px]">Add bank cash, funds, or holdings to populate</p>
            </div>
          )}
        </div>
      </div>

      {/* Spending by Category 2D Bar Skyline */}
      <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#f5f3ef]">Monthly Spending Breakdown</h3>
            <p className="text-xs text-[#9e9a93]">Current calendar month expenditures</p>
          </div>
          <span className="text-xs text-[#9e9a93]">{spendingData.length} Categories</span>
        </div>

        <div className="h-64 w-full">
          {spendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" tickFormatter={(v) => `$${v}`} stroke="#716c64" fontSize={11} />
                <YAxis type="category" dataKey="category" stroke="#716c64" fontSize={11} width={110} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']}
                  contentStyle={{ backgroundColor: '#111419', borderColor: '#2a2418', borderRadius: '0.75rem', color: '#f5f3ef' }}
                />
                <Bar dataKey="amount" fill="#d4af37" radius={[0, 4, 4, 0]} onClick={(data) => onSelectCategory(data.category)} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-[#9e9a93]">
              <p>No expenses recorded this month</p>
            </div>
          )}
        </div>
      </div>

      {/* Sinking Funds Progress List */}
      <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f5f3ef]">Sinking Funds Progress</h3>
          <span className="text-xs text-[#9e9a93]">{funds.length} Active Funds</span>
        </div>

        {funds.length > 0 ? (
          <div className="space-y-3">
            {funds.map((f) => {
              const pct = f.targetAmountCents > 0 ? Math.min(100, Math.round((f.currentAmountCents / f.targetAmountCents) * 100)) : 0;
              return (
                <div
                  key={f.id}
                  onClick={() => onSelectFund(f.id)}
                  className="cursor-pointer rounded-xl border border-[#262930] bg-[#171a21]/50 p-3 hover:border-gold/40 hover:bg-[#1e222b] transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#f5f3ef]">{f.name}</span>
                    <span className="text-gold-light font-medium">
                      ${(f.currentAmountCents / 100).toLocaleString()} / ${(f.targetAmountCents / 100).toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1e222b]">
                    <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#9e9a93]">
            No sinking funds created yet.
          </div>
        )}
      </div>

      {/* Portfolio Allocation 2D List */}
      <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f5f3ef]">Portfolio Holdings</h3>
          <span className="text-xs text-[#9e9a93]">{holdings.length} Assets</span>
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
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[#262930] bg-[#171a21]/50 p-2.5 hover:border-gold/40 hover:bg-[#1e222b] transition-all text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#f5f3ef]">{item.ticker}</span>
                    <span className="text-[11px] text-[#9e9a93]">({sharePct}% of portfolio)</span>
                  </div>
                  <div className="font-semibold text-gold-light">
                    ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#9e9a93]">
            No portfolio holdings added yet.
          </div>
        )}
      </div>
    </div>
  );
}
