'use client';

import React, { useMemo } from 'react';
import { useStore, getLocalDate, getLocalMonth, formatDisplayDate } from '@/lib/store';
import { formatMoney, fromSmallestUnit, parseToSmallestUnit, convertCurrency } from '@/lib/currencies';
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
import { PiggyBank, TrendingUp, Wallet, ArrowRight, Calendar, Calculator, Clock } from 'lucide-react';
import { BillsCard } from '@/components/bills/BillsCard';

export function Dashboard2D({
  onSelectCategory,
  onSelectFund,
  onSelectInvestment,
  onSelectMonthFilter,
}: {
  onSelectCategory: (cat: string) => void;
  onSelectFund: (fundId: string) => void;
  onSelectInvestment: (id: string) => void;
  onSelectMonthFilter: (monthStr: string) => void;
}) {
  const {
    totalNetWorthCents,
    totalBankCashCents,
    totalFundsCents,
    totalInvestmentsCents,
    totalCreditOwedCents,
    displayCurrency,
    expenses,
    funds,
    investments,
    accounts,
    fxRatesMap,
    netWorthUnconverted,
    hideAmounts,
    displayMoney,
    displayPercent,
  } = useStore();

  const rates = fxRatesMap?.rates || {};

  // 1. Net Worth 2D Pie Composition
  const netWorthData = [
    { name: 'Bank Cash', value: fromSmallestUnit(totalBankCashCents, displayCurrency), color: '#e5c07b' },
    { name: 'Sinking Funds', value: fromSmallestUnit(totalFundsCents, displayCurrency), color: '#d4af37' },
    { name: 'Investments', value: fromSmallestUnit(totalInvestmentsCents, displayCurrency), color: '#b8b2a7' },
  ];

  // 2. Six-Month Spending Trend — Debit Spend Only (Fix 21)
  const sixMonthTrend = useMemo(() => {
    const months: Array<{ monthStr: string; label: string; debitSpendCents: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthStr = `${y}-${m}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      // Sum only DEBIT entries for this month, converted to display currency (Item 4: Never silently mix unconverted amounts)
      const sumCents = expenses
        .filter((e) => e.date.startsWith(monthStr) && (e.entryType === 'debit' || !e.entryType))
        .reduce((acc, e) => {
          if (e.currency === displayCurrency) return acc + e.amountCents;
          const conv = convertCurrency(e.amountCents, e.currency, displayCurrency, rates);
          return acc + (conv ? conv.convertedAmount : 0);
        }, 0);

      months.push({
        monthStr,
        label,
        debitSpendCents: sumCents,
      });
    }

    return months;
  }, [expenses, displayCurrency, rates]);

  // 3. Current Month Spending by Category
  const currentMonthStr = getLocalMonth();
  const categoryMap = new Map<string, number>();
  expenses
    .filter((e) => e.date.startsWith(currentMonthStr) && (e.entryType === 'debit' || !e.entryType))
    .forEach((e) => {
      let amtCents = 0;
      if (e.currency === displayCurrency) {
        amtCents = e.amountCents;
      } else {
        const conv = convertCurrency(e.amountCents, e.currency, displayCurrency, rates);
        if (conv) amtCents = conv.convertedAmount;
      }
      const amt = fromSmallestUnit(amtCents, displayCurrency);
      categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + amt);
    });

  const categorySpendingData = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Top Grid: Net Worth Composition & 6-Month Spending Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Net Worth 2D Composition Card */}
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Net Worth Composition</h3>
              <p className="text-xs text-[#9e9a93]">
                Total Net Worth: {displayMoney(totalNetWorthCents, displayCurrency)}
                {netWorthUnconverted.length > 0 ? ` * (Partial: ${netWorthUnconverted.join(', ')})` : ''}
              </p>
            </div>
            <span className="rounded bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold-light border border-gold/30">
              2D Verified
            </span>
          </div>

          {/* 4 Buckets Separation Strip */}
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 p-3 rounded-xl bg-[#0b0d10]/90 border border-[#262930]">
            <div>
              <span className="text-[#9e9a93]">1. Bank Cash:</span>{' '}
              <span className="font-semibold text-gold-light font-mono">
                {displayMoney(totalBankCashCents, displayCurrency)}
              </span>
            </div>
            <div>
              <span className="text-[#9e9a93]">2. Sinking Funds:</span>{' '}
              <span className="font-semibold text-gold font-mono">
                {displayMoney(totalFundsCents, displayCurrency)}
              </span>
            </div>
            <div>
              <span className="text-[#9e9a93]">3. Investments:</span>{' '}
              <span className="font-semibold text-[#c8c4bc] font-mono">
                {displayMoney(totalInvestmentsCents, displayCurrency)}
              </span>
            </div>
            <div>
              <span className="text-[#9e9a93]">4. Credit Owed:</span>{' '}
              <span className="font-semibold text-rose-400 font-mono">
                {hideAmounts ? '' : '-'}{displayMoney(totalCreditOwedCents, displayCurrency)}
              </span>
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
                    formatter={(val: number) => [
                      displayMoney(parseToSmallestUnit(val, displayCurrency), displayCurrency),
                      'Total',
                    ]}
                    contentStyle={{
                      backgroundColor: '#111419',
                      borderColor: '#2a2418',
                      borderRadius: '0.75rem',
                      color: '#f5f3ef',
                    }}
                  />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span className="text-xs text-[#9e9a93]">
                        {value}: {displayMoney(parseToSmallestUnit(entry.payload.value, displayCurrency), displayCurrency)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-xs text-[#9e9a93]">
                <p>{displayMoney(0, displayCurrency)} Total Net Worth</p>
                <p className="mt-1 text-[11px]">Add accounts, funds, or investments to populate</p>
              </div>
            )}
          </div>
        </div>

        {/* 6-Month Spending Trend — 2D Dashboard Only (Fix 21) */}
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">6-Month Spending Trend</h3>
              <p className="text-xs text-[#9e9a93]">
                Debit spending by calendar month • Click a bar to filter expenses
              </p>
            </div>
            <span className="text-[10px] text-gold-light bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
              Debits Only
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sixMonthTrend.map((m) => ({
                  ...m,
                  amount: fromSmallestUnit(m.debitSpendCents, displayCurrency),
                }))}
                margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="label" stroke="#716c64" fontSize={11} />
                <YAxis
                  stroke="#716c64"
                  fontSize={11}
                  tickFormatter={(val) => (hideAmounts ? '••' : `${val}`)}
                />
                <Tooltip
                  formatter={(val: number, name: string, props: any) => [
                    displayMoney(parseToSmallestUnit(val, displayCurrency), displayCurrency),
                    'Debit Spend',
                  ]}
                  contentStyle={{
                    backgroundColor: '#111419',
                    borderColor: '#2a2418',
                    borderRadius: '0.75rem',
                    color: '#f5f3ef',
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="#d4af37"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => {
                    if (entry && entry.monthStr) {
                      onSelectMonthFilter(entry.monthStr);
                    }
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[#9e9a93] pt-2 border-t border-[#1e222b]">
            <span>Past 6 Calendar Months</span>
            <span>Empty months show $0 bars</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Category Breakdown & Investments List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Spending by Category */}
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Current Month Expenditures</h3>
              <p className="text-xs text-[#9e9a93]">Sorted by highest debit spend category</p>
            </div>
            <span className="text-xs text-[#9e9a93]">{categorySpendingData.length} Categories</span>
          </div>

          <div className="h-64 w-full">
            {categorySpendingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categorySpendingData}
                  layout="vertical"
                  margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                >
                  <XAxis type="number" stroke="#716c64" fontSize={11} tickFormatter={(val) => (hideAmounts ? '••' : `${val}`)} />
                  <YAxis type="category" dataKey="category" stroke="#716c64" fontSize={11} width={110} />
                  <Tooltip
                    formatter={(v: number) => [
                      displayMoney(parseToSmallestUnit(v, displayCurrency), displayCurrency),
                      'Spent',
                    ]}
                    contentStyle={{
                      backgroundColor: '#111419',
                      borderColor: '#2a2418',
                      borderRadius: '0.75rem',
                      color: '#f5f3ef',
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#d4af37"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => onSelectCategory(data.category)}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-xs text-[#9e9a93]">
                <p>No debit expenses recorded this month</p>
              </div>
            )}
          </div>
        </div>

        {/* Investments 2D List (Fix 0: Manual Totals Model) */}
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Investments (Manual Totals)</h3>
              <p className="text-xs text-[#9e9a93]">
                Total: {displayMoney(totalInvestmentsCents, displayCurrency)}
              </p>
            </div>
            <span className="text-xs text-[#9e9a93]">{investments.length} Entries</span>
          </div>

          {investments.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {investments.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectInvestment(item.id)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[#262930] bg-[#171a21]/50 p-2.5 hover:border-gold/40 hover:bg-[#1e222b] transition-all text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#f5f3ef]">{item.label || item.type}</span>
                      <span className="text-[10px] text-gold-light bg-[#1e222b] px-1.5 py-0.5 rounded">
                        {item.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#9e9a93] mt-0.5">
                      Updated: {formatDisplayDate(item.lastUpdated)}
                    </div>
                  </div>
                  <div className="font-semibold text-gold-light font-mono">
                    {displayMoney(item.amountCents, item.currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#9e9a93]">
              No investment totals entered yet.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Sinking Funds Progress & Bill Reminders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sinking Funds Progress List */}
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f5f3ef]">Sinking Funds Progress</h3>
            <span className="text-xs text-[#9e9a93]">{funds.length} Active Funds</span>
          </div>

          {funds.length > 0 ? (
            <div className="space-y-3">
              {funds.map((f) => {
                const pct =
                  f.targetAmountCents > 0
                    ? Math.min(100, Math.round((f.currentAmountCents / f.targetAmountCents) * 100))
                    : 0;
                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectFund(f.id)}
                    className="cursor-pointer rounded-xl border border-[#262930] bg-[#171a21]/50 p-3 hover:border-gold/40 hover:bg-[#1e222b] transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#f5f3ef]">{f.name}</span>
                      <span className="text-gold-light font-medium font-mono">
                        {displayMoney(f.currentAmountCents, f.currency)} / {displayMoney(f.targetAmountCents, f.currency)} ({displayPercent(pct)})
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
            <div className="py-8 text-center text-xs text-[#9e9a93]">No sinking funds created yet.</div>
          )}
        </div>

        {/* Bill Reminders Card (Fix 22) */}
        <BillsCard />
      </div>
    </div>
  );
}
