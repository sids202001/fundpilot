'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ShieldCheck, ArrowUpRight, ArrowDownRight, Wallet, DollarSign, Edit3, Check } from 'lucide-react';

export function NetWorthSummary() {
  const {
    totalNetWorthCents,
    totalFundsCents,
    totalPortfolioCents,
    creditCardOwedCents,
    safeToSpendMonthCents,
    settings,
    updateSettings,
    expenses,
    fundAllocations,
  } = useStore();

  const [isEditingCash, setIsEditingCash] = useState(false);
  const [bankCashInput, setBankCashInput] = useState((settings.bankCashCents / 100).toString());
  const [creditOwedInput, setCreditOwedInput] = useState((settings.creditCardOwedCents / 100).toString());
  const [incomeInput, setIncomeInput] = useState((settings.monthlyIncomeCents / 100).toString());
  const [fixedBillsInput, setFixedBillsInput] = useState((settings.fixedBillsCents / 100).toString());

  const currentMonth = new Date().toISOString().substring(0, 7);
  const spentThisMonthCents = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amountCents, 0);

  const fundAllocationsThisMonthCents = fundAllocations
    .filter((a) => a.date.startsWith(currentMonth) && a.type === 'deposit')
    .reduce((sum, a) => sum + a.amountCents, 0);

  const totalMonthlyOutflowCents = spentThisMonthCents + settings.fixedBillsCents;
  const netSavedMonthCents = Math.max(0, settings.monthlyIncomeCents - totalMonthlyOutflowCents);
  const savingsRatePct =
    settings.monthlyIncomeCents > 0
      ? Math.round((netSavedMonthCents / settings.monthlyIncomeCents) * 100)
      : 0;

  const handleSaveSettings = () => {
    const cashCents = Math.round(parseFloat(bankCashInput || '0') * 100);
    const creditCents = Math.round(parseFloat(creditOwedInput || '0') * 100);
    const incCents = Math.round(parseFloat(incomeInput || '0') * 100);
    const billsCents = Math.round(parseFloat(fixedBillsInput || '0') * 100);

    updateSettings({
      bankCashCents: isNaN(cashCents) ? 0 : cashCents,
      creditCardOwedCents: isNaN(creditCents) ? 0 : creditCents,
      monthlyIncomeCents: isNaN(incCents) ? 0 : incCents,
      fixedBillsCents: isNaN(billsCents) ? 0 : billsCents,
    });
    setIsEditingCash(false);
  };

  return (
    <div className="space-y-4">
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Net Worth Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Total Net Worth</span>
            <button
              onClick={() => {
                setBankCashInput((settings.bankCashCents / 100).toString());
                setCreditOwedInput((settings.creditCardOwedCents / 100).toString());
                setIncomeInput((settings.monthlyIncomeCents / 100).toString());
                setFixedBillsInput((settings.fixedBillsCents / 100).toString());
                setIsEditingCash(!isEditingCash);
              }}
              className="text-slate-500 hover:text-teal-400"
              title="Edit Bank Cash & Inflows"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-white">
            ${(totalNetWorthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span>Cash: ${(settings.bankCashCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span>•</span>
            <span>Funds: ${(totalFundsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span>•</span>
            <span>Port: ${(totalPortfolioCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span>•</span>
            <span className="text-rose-400">Credit Owed: -${(creditCardOwedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
          </div>
          <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-teal-500 to-emerald-400" />
        </div>

        {/* Safe to Spend This Month Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Safe to Spend (Month)</span>
            <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] text-teal-300 border border-teal-500/20">
              Discretionary
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
            ${(safeToSpendMonthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Income − Fixed bills − Fund deposits − Already spent
          </p>
          <div className="absolute right-0 top-0 h-1 w-full bg-emerald-500" />
        </div>

        {/* Monthly Cash Flow Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Monthly Cash Flow</span>
            <div className="flex items-center text-[11px] text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              <span>{savingsRatePct}% Saved</span>
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-white">
            ${(netSavedMonthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>In: ${(settings.monthlyIncomeCents / 100).toFixed(0)}</span>
            <span>Out: ${(totalMonthlyOutflowCents / 100).toFixed(0)}</span>
          </div>
          <div className="absolute right-0 top-0 h-1 w-full bg-indigo-500" />
        </div>

        {/* Sinking Funds Progress Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Sinking Funds Total</span>
            <span className="text-[10px] text-slate-500">Money with a job</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-teal-300">
            ${(totalFundsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Excluded from spendable cash everywhere
          </p>
          <div className="absolute right-0 top-0 h-1 w-full bg-teal-500" />
        </div>
      </div>

      {/* Inline Quick Cash & Inflow Editor */}
      {isEditingCash && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Adjust Bank Cash, Credit Card Debt & Cash Flow
            </h4>
            <button
              onClick={() => setIsEditingCash(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[11px] text-slate-400">Liquid Bank Cash ($)</label>
              <input
                type="number"
                step="any"
                value={bankCashInput}
                onChange={(e) => setBankCashInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Credit Card Owed ($)</label>
              <input
                type="number"
                step="any"
                value={creditOwedInput}
                onChange={(e) => setCreditOwedInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-rose-300 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Monthly Net Income ($)</label>
              <input
                type="number"
                step="any"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Fixed Monthly Bills ($)</label>
              <input
                type="number"
                step="any"
                value={fixedBillsInput}
                onChange={(e) => setFixedBillsInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400"
            >
              <Check className="h-3.5 w-3.5" />
              Save Cash Balances
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
