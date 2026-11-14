'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ArrowUpRight, Edit3, Check, Calculator } from 'lucide-react';

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

  const cashDollars = settings.bankCashCents / 100;
  const fundsDollars = totalFundsCents / 100;
  const portDollars = totalPortfolioCents / 100;
  const creditDollars = creditCardOwedCents / 100;
  const netWorthDollars = totalNetWorthCents / 100;

  return (
    <div className="space-y-4">
      {/* Primary KPI Cards — Warm Charcoal + Champagne Gold Hierarchy */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Net Worth Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e222b] bg-[#111419]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-[#d4af37]/40">
          <div className="flex items-center justify-between text-xs text-[#9e9a93]">
            <span className="font-semibold uppercase tracking-wider text-[#d4af37]">Total Net Worth</span>
            <button
              onClick={() => {
                setBankCashInput((settings.bankCashCents / 100).toString());
                setCreditOwedInput((settings.creditCardOwedCents / 100).toString());
                setIncomeInput((settings.monthlyIncomeCents / 100).toString());
                setFixedBillsInput((settings.fixedBillsCents / 100).toString());
                setIsEditingCash(!isEditingCash);
              }}
              className="rounded-lg p-1 text-[#9e9a93] hover:bg-[#1a1d24] hover:text-[#d4af37] transition-colors"
              title="Edit Bank Cash & Inflows"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#f5f3ef]">
            ${netWorthDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-[#9e9a93]">
            <span>Cash: <strong className="text-[#e5c07b]">${cashDollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong></span>
            <span className="text-[#3a3f4d]">•</span>
            <span>Funds: <strong className="text-[#d4af37]">${fundsDollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong></span>
            <span className="text-[#3a3f4d]">•</span>
            <span>Port: <strong className="text-[#22c55e]">${portDollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong></span>
            <span className="text-[#3a3f4d]">•</span>
            <span>Credit: <strong className="text-[#ef4444]">-${creditDollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong></span>
          </div>
          <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-[#d4af37] via-[#f3d99b] to-[#b8860b]" />
        </div>

        {/* Safe to Spend This Month Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e222b] bg-[#111419]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-[#22c55e]/30">
          <div className="flex items-center justify-between text-xs text-[#9e9a93]">
            <span className="font-semibold uppercase tracking-wider text-[#f5f3ef]">Safe to Spend</span>
            <span className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-medium text-[#4ade80] border border-[#22c55e]/25">
              Discretionary
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#4ade80]">
            ${(safeToSpendMonthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-4 text-[11px] text-[#9e9a93]">
            Income − Fixed bills − Fund deposits − Already spent
          </p>
          <div className="absolute right-0 top-0 h-1 w-full bg-[#22c55e]" />
        </div>

        {/* Monthly Cash Flow Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e222b] bg-[#111419]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-[#d4af37]/30">
          <div className="flex items-center justify-between text-xs text-[#9e9a93]">
            <span className="font-semibold uppercase tracking-wider text-[#f5f3ef]">Monthly Cash Flow</span>
            <div className="flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-medium text-[#4ade80] border border-[#22c55e]/25">
              <ArrowUpRight className="h-3 w-3" />
              <span>{savingsRatePct}% Saved</span>
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#f5f3ef]">
            ${(netSavedMonthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-[#9e9a93]">
            <span>Inflows: ${(settings.monthlyIncomeCents / 100).toFixed(0)}</span>
            <span>Outflows: ${(totalMonthlyOutflowCents / 100).toFixed(0)}</span>
          </div>
          <div className="absolute right-0 top-0 h-1 w-full bg-[#d4af37]" />
        </div>

        {/* Sinking Funds Total Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e222b] bg-[#111419]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-[#d4af37]/40">
          <div className="flex items-center justify-between text-xs text-[#9e9a93]">
            <span className="font-semibold uppercase tracking-wider text-[#d4af37]">Sinking Funds Total</span>
            <span className="rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-medium text-[#f3d99b] border border-[#d4af37]/25">
              Money with a Job
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#f3d99b]">
            ${fundsDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-4 text-[11px] text-[#9e9a93]">
            Protected from discretionary spendable cash everywhere
          </p>
          <div className="absolute right-0 top-0 h-1 w-full bg-[#d4af37]" />
        </div>
      </div>

      {/* 4-Bucket Exact Mathematical Reconciliation Strip */}
      <div className="rounded-xl border border-[#1e222b] bg-[#111419]/90 px-4 py-2.5 backdrop-blur-sm text-[11px] text-[#9e9a93] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-[#d4af37]" />
          <span className="font-semibold text-[#f5f3ef]">Net Worth Formula:</span>
          <span>
            <span className="text-[#e5c07b] font-medium">Bank Cash (${cashDollars.toFixed(0)})</span> +{' '}
            <span className="text-[#d4af37] font-medium">Sinking Funds (${fundsDollars.toFixed(0)})</span> +{' '}
            <span className="text-[#22c55e] font-medium">Portfolio (${portDollars.toFixed(0)})</span> −{' '}
            <span className="text-[#ef4444] font-medium">Credit Owed (${creditDollars.toFixed(0)})</span> ={' '}
            <strong className="text-[#f5f3ef]">${netWorthDollars.toFixed(2)}</strong>
          </span>
        </div>
        <span className="text-[10px] text-[#606b7d] font-mono">
          Integer-Cent Accuracy Guaranteed
        </span>
      </div>

      {/* Inline Quick Cash & Inflow Editor */}
      {isEditingCash && (
        <div className="rounded-2xl border border-[#2c323f] bg-[#171a21] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
              Adjust Bank Cash, Credit Card Debt & Monthly Cash Flow
            </h4>
            <button
              onClick={() => setIsEditingCash(false)}
              className="text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[11px] font-medium text-[#f5f3ef]">Liquid Bank Cash ($)</label>
              <input
                type="number"
                step="any"
                value={bankCashInput}
                onChange={(e) => setBankCashInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#1e222b] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-[#d4af37] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#f5f3ef]">Credit Card Owed ($)</label>
              <input
                type="number"
                step="any"
                value={creditOwedInput}
                onChange={(e) => setCreditOwedInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#1e222b] bg-[#0b0d10] px-3 py-2 text-xs text-[#f87171] focus:border-[#ef4444] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#f5f3ef]">Monthly Net Income ($)</label>
              <input
                type="number"
                step="any"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#1e222b] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-[#d4af37] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#f5f3ef]">Fixed Monthly Bills ($)</label>
              <input
                type="number"
                step="any"
                value={fixedBillsInput}
                onChange={(e) => setFixedBillsInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#1e222b] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-[#d4af37] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:bg-[#e5c07b] transition-colors shadow-md shadow-[#d4af37]/20"
            >
              <Check className="h-3.5 w-3.5" />
              Save Vault Inflows
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
