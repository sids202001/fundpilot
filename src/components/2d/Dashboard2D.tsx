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
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { PiggyBank, TrendingUp, Wallet, Plus, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { BillsCard } from '@/components/bills/BillsCard';
import { CashFlowForecastCard } from '@/components/dashboard/CashFlowForecastCard';
import { TiltCard } from '@/components/3d-ui/TiltCard';
import { MagneticButton } from '@/components/3d-ui/MagneticButton';
import { getCategoryNetSpendMap, computeFundPace } from '@/lib/financeHelpers';
import type { AppNavTab } from '@/components/Navbar';

export function Dashboard2D({
  onSelectCategory,
  onSelectFund,
  onSelectInvestment,
  onSelectMonthFilter,
  onNavigateTab,
}: {
  onSelectCategory: (cat: string) => void;
  onSelectFund: (fundId: string) => void;
  onSelectInvestment: (id: string) => void;
  onSelectMonthFilter: (monthStr: string) => void;
  onNavigateTab?: (tab: AppNavTab) => void;
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
    fundAllocations,
    fundAutoRules,
    investments,
    netWorthSnapshots,
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

  // 3. Current Month Spending by Category (supports Split Transactions & Category Refunds)
  const currentMonthStr = getLocalMonth();
  const categoryMapCents = useMemo(
    () => getCategoryNetSpendMap(expenses, currentMonthStr, displayCurrency, rates),
    [expenses, currentMonthStr, displayCurrency, rates]
  );

  const categorySpendingData = Array.from(categoryMapCents.entries())
    .filter(([, cents]) => cents > 0)
    .map(([category, cents]) => ({ category, amount: fromSmallestUnit(cents, displayCurrency) }))
    .sort((a, b) => b.amount - a.amount);

  // 4. Net Worth Over Time Line Graph Data (Part E)
  const netWorthLineData = useMemo(() => {
    const sorted = [...netWorthSnapshots].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.map((s) => {
      const [y, m] = s.month.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return {
        month: s.month,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        netWorth: fromSmallestUnit(s.netWorthCents, displayCurrency),
      };
    });
  }, [netWorthSnapshots, displayCurrency]);

  return (
    <div className="space-y-6">
      {/* Top Grid: Net Worth Composition & 6-Month Spending Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Net Worth 2D Composition Card */}
        <TiltCard maxTilt={3.5} className="card-3d rounded-2xl p-5">
          <div className="tilt-z-sm mb-3 flex items-center justify-between">
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
          <div className="well-3d grid grid-cols-2 gap-2 text-[11px] mb-3 p-3 rounded-xl">
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

          <div className="well-3d h-64 w-full rounded-xl p-2">
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
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#2c303a] bg-[#0b0d10]/60 px-4 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gold/40 bg-gold/5 text-gold-light">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[#f5f3ef]">No net worth data yet</p>
                <p className="mt-1 max-w-xs text-xs text-[#c2bdb4]">
                  Add your first expense, sinking fund, or investment to see your composition chart.
                </p>
                {onNavigateTab && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <MagneticButton
                      type="button"
                      onClick={() => onNavigateTab('expenses')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-light px-3 py-1.5 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Expense
                    </MagneticButton>
                    <MagneticButton
                      type="button"
                      onClick={() => onNavigateTab('funds')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-gold/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Fund
                    </MagneticButton>
                    <MagneticButton
                      type="button"
                      onClick={() => onNavigateTab('investments')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-gold/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Investment
                    </MagneticButton>
                  </div>
                )}
              </div>
            )}
          </div>
        </TiltCard>

        {/* 6-Month Spending Trend — 2D Dashboard Only (Fix 21) */}
        <TiltCard maxTilt={3.5} className="card-3d rounded-2xl p-5">
          <div className="tilt-z-sm mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">6-Month Spending Trend</h3>
              <p className="text-xs text-[#c2bdb4]">
                Debit spending by calendar month • Click a bar to filter expenses
              </p>
            </div>
            <span className="text-[10px] text-gold-light bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
              Debits Only
            </span>
          </div>

          <div className="well-3d h-64 w-full rounded-xl p-2">
            {sixMonthTrend.some((m) => m.debitSpendCents > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sixMonthTrend.map((m) => ({
                    ...m,
                    amount: fromSmallestUnit(m.debitSpendCents, displayCurrency),
                  }))}
                  margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="label" stroke="#a9a49b" fontSize={11} />
                  <YAxis
                    stroke="#a9a49b"
                    fontSize={11}
                    tickFormatter={(val) => (hideAmounts ? '••' : `${val}`)}
                  />
                  <Tooltip
                    formatter={(val: number) => [
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
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#2c303a] bg-[#0b0d10]/60 px-4 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold-light">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[#f5f3ef]">No spending data yet</p>
                <p className="mt-1 max-w-xs text-xs text-[#c2bdb4]">
                  Log your first expense to track monthly debit spending trends across the past 6 months.
                </p>
                {onNavigateTab && (
                  <MagneticButton
                    type="button"
                    onClick={() => onNavigateTab('expenses')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Your First Expense
                  </MagneticButton>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[#c2bdb4] pt-2 border-t border-[#1e222b]">
            <span>Past 6 Calendar Months</span>
            <span>Empty months show $0 bars</span>
          </div>
        </TiltCard>
      </div>

      {/* Net Worth Over Time — Line Graph (Part E: Auto-saved monthly snapshots) */}
      <TiltCard maxTilt={2.5} className="card-3d rounded-2xl p-5">
        <div className="tilt-z-sm mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Net Worth Over Time</h3>
            </div>
            <p className="text-xs text-[#c2bdb4]">
              Automatically saved at the end of each month • Encrypted in your local vault
            </p>
          </div>
          <span className="rounded bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold-light border border-gold/30">
            {netWorthLineData.length} {netWorthLineData.length === 1 ? 'Month' : 'Months'} Recorded
          </span>
        </div>

        <div className="well-3d h-60 w-full rounded-xl p-3">
          {netWorthLineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthLineData} margin={{ top: 12, right: 20, left: 4, bottom: 5 }}>
                <CartesianGrid stroke="#1e222b" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#a9a49b" fontSize={11} />
                <YAxis
                  stroke="#a9a49b"
                  fontSize={11}
                  tickFormatter={(val) => (hideAmounts ? '••' : `${val}`)}
                />
                <Tooltip
                  formatter={(val: number) => [
                    displayMoney(parseToSmallestUnit(val, displayCurrency), displayCurrency),
                    'Net Worth',
                  ]}
                  contentStyle={{
                    backgroundColor: '#111419',
                    borderColor: '#d4af37',
                    borderRadius: '0.75rem',
                    color: '#f5f3ef',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#d4af37"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f3d99b', stroke: '#d4af37', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#f3d99b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#c2bdb4]">
              Monthly net worth snapshots will appear here automatically.
            </div>
          )}
        </div>
      </TiltCard>

      {/* 3-Month Day-by-Day Cash-Flow Forecast + What-If (Part D) */}
      <CashFlowForecastCard />

      {/* Middle Grid: Category Breakdown & Investments List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Spending by Category */}
        <TiltCard maxTilt={3.5} className="card-3d rounded-2xl p-5">
          <div className="tilt-z-sm mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Current Month Expenditures</h3>
              <p className="text-xs text-[#9e9a93]">Sorted by highest debit spend category</p>
            </div>
            <span className="text-xs text-[#9e9a93]">{categorySpendingData.length} Categories</span>
          </div>

          <div className="well-3d h-64 w-full rounded-xl p-2">
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
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#2c303a] bg-[#0b0d10]/60 px-4 text-center">
                <Wallet className="mb-2 h-6 w-6 text-gold-light/80" />
                <p className="text-xs font-semibold text-[#f5f3ef]">No expenses recorded this month</p>
                {onNavigateTab && (
                  <MagneticButton
                    type="button"
                    onClick={() => onNavigateTab('expenses')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-gold/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Expense
                  </MagneticButton>
                )}
              </div>
            )}
          </div>
        </TiltCard>

        {/* Investments 2D List (Fix 0: Manual Totals Model) */}
        <TiltCard maxTilt={3.5} className="card-3d rounded-2xl p-5">
          <div className="tilt-z-sm mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Investments (Manual Totals)</h3>
              <p className="text-xs text-[#c2bdb4]">
                Total: {displayMoney(totalInvestmentsCents, displayCurrency)}
              </p>
            </div>
            <span className="text-xs text-[#c2bdb4]">{investments.length} Entries</span>
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
                    <div className="text-[10px] text-[#c2bdb4] mt-0.5">
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2c303a] bg-[#0b0d10]/60 py-10 px-4 text-center">
              <TrendingUp className="mb-2 h-6 w-6 text-gold-light/80" />
              <p className="text-xs font-semibold text-[#f5f3ef]">No investments entered yet</p>
              {onNavigateTab && (
                <MagneticButton
                  type="button"
                  onClick={() => onNavigateTab('investments')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-gold/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Your First Investment
                </MagneticButton>
              )}
            </div>
          )}
        </TiltCard>
      </div>

      {/* Bottom Grid: Sinking Funds Progress & Bill Reminders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sinking Funds Progress List */}
        <TiltCard maxTilt={3.5} className="card-3d rounded-2xl p-5">
          <div className="tilt-z-sm mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f5f3ef]">Sinking Funds Progress</h3>
            <span className="text-xs text-[#c2bdb4]">{funds.length} Active Funds</span>
          </div>

          {funds.length > 0 ? (
            <div className="space-y-3">
              {funds.map((f) => {
                const pct =
                  f.targetAmountCents > 0
                    ? Math.min(100, Math.round((f.currentAmountCents / f.targetAmountCents) * 100))
                    : 0;
                const pace = computeFundPace(f, fundAutoRules, fundAllocations, currentMonthStr);
                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectFund(f.id)}
                    className="cursor-pointer rounded-xl border border-[#262930] bg-[#171a21]/50 p-3 hover:border-gold/40 hover:bg-[#1e222b] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#f5f3ef]">{f.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${
                            pace.status === 'funded'
                              ? 'bg-gold/15 text-gold-light border-gold/40'
                              : pace.status === 'on-track'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {pace.status === 'funded' ? 'Funded' : pace.status === 'on-track' ? 'On Track' : 'At Risk'}
                        </span>
                      </div>
                      <span className="text-gold-light font-medium font-mono">
                        {displayMoney(f.currentAmountCents, f.currency)} / {displayMoney(f.targetAmountCents, f.currency)} ({displayPercent(pct)})
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1e222b]">
                      <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1.5 text-[10px] text-[#c2bdb4]">
                      Required: {displayMoney(pace.requiredMonthlyCents, f.currency)}/mo • {pace.monthsLeft} {pace.monthsLeft === 1 ? 'mo' : 'mos'} left
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2c303a] bg-[#0b0d10]/60 py-8 px-4 text-center">
              <PiggyBank className="mb-2 h-6 w-6 text-gold-light/80" />
              <p className="text-xs font-semibold text-[#f5f3ef]">No sinking funds created yet</p>
              {onNavigateTab && (
                <MagneticButton
                  type="button"
                  onClick={() => onNavigateTab('funds')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-gold/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Your First Fund
                </MagneticButton>
              )}
            </div>
          )}
        </TiltCard>

        {/* Bill Reminders Card (Fix 22) */}
        <BillsCard />
      </div>
    </div>
  );
}
