'use client';

import React, { useState } from 'react';
import { useStore, getLocalDate, getLocalMonth } from '@/lib/store';
import { formatMoney } from '@/lib/currencies';
import { ArrowUpRight, ArrowDownRight, Edit3, Check, Calculator, AlertTriangle } from 'lucide-react';

export function NetWorthSummary() {
  const {
    totalNetWorthCents,
    totalBankCashCents,
    totalFundsCents,
    totalInvestmentsCents,
    totalCreditOwedCents,
    safeToSpendMonthCents,
    netWorthUnconverted,
    bankCashUnconverted,
    fundsUnconverted,
    investmentsUnconverted,
    creditOwedUnconverted,
    safeToSpendUnconverted,
    settings,
    updateSettings,
    accounts,
    updateAccount,
    expenses,
    fundAllocations,
    displayCurrency,
    hideAmounts,
    displayMoney,
    displayPercent,
  } = useStore();

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const primaryBank = accounts.find((a) => a.type === 'bank' || a.type === 'cash');
  const primaryCredit = accounts.find((a) => a.type === 'credit');
  const [bankCashInput, setBankCashInput] = useState(((primaryBank?.balanceCents ?? settings.bankCashCents ?? 0) / 100).toString());
  const [creditOwedInput, setCreditOwedInput] = useState(((primaryCredit?.balanceCents ?? settings.creditCardOwedCents ?? 0) / 100).toString());
  const [incomeInput, setIncomeInput] = useState(((settings.monthlyIncomeCents || 0) / 100).toString());
  const [fixedBillsInput, setFixedBillsInput] = useState(((settings.fixedBillsCents || 0) / 100).toString());

  const currentMonth = getLocalMonth();

  // Spend this month (debit expenses only)
  const spentThisMonthCents = expenses
    .filter((e) => e.date.startsWith(currentMonth) && (e.entryType || 'debit') === 'debit')
    .reduce((sum, e) => sum + e.amountCents, 0);

  // Inflow credits this month
  const creditsThisMonthCents = expenses
    .filter((e) => e.date.startsWith(currentMonth) && e.entryType === 'credit')
    .reduce((sum, e) => sum + e.amountCents, 0);

  const fundAllocationsThisMonthCents = fundAllocations
    .filter((a) => a.date.startsWith(currentMonth) && a.type === 'deposit')
    .reduce((sum, a) => sum + a.amountCents, 0);

  const totalMonthlyInflowsCents = (settings.monthlyIncomeCents || 0) + creditsThisMonthCents;
  const totalMonthlyOutflowCents = spentThisMonthCents + (settings.fixedBillsCents || 0);
  const netSavedMonthCents = Math.max(0, totalMonthlyInflowsCents - totalMonthlyOutflowCents);
  const savingsRatePct =
    totalMonthlyInflowsCents > 0
      ? Math.round((netSavedMonthCents / totalMonthlyInflowsCents) * 100)
      : 0;

  const handleSaveSettings = () => {
    const cashCents = Math.round(parseFloat(bankCashInput || '0') * 100);
    const creditCents = Math.round(parseFloat(creditOwedInput || '0') * 100);
    const incCents = Math.round(parseFloat(incomeInput || '0') * 100);
    const billsCents = Math.round(parseFloat(fixedBillsInput || '0') * 100);

    if (primaryBank && !isNaN(cashCents)) {
      updateAccount(primaryBank.id, { balanceCents: cashCents, lastEditedDate: getLocalDate() });
    }
    if (primaryCredit && !isNaN(creditCents)) {
      updateAccount(primaryCredit.id, { balanceCents: creditCents, lastEditedDate: getLocalDate() });
    }

    updateSettings({
      bankCashCents: isNaN(cashCents) ? 0 : cashCents,
      creditCardOwedCents: isNaN(creditCents) ? 0 : creditCents,
      monthlyIncomeCents: isNaN(incCents) ? 0 : incCents,
      fixedBillsCents: isNaN(billsCents) ? 0 : billsCents,
    });
    setIsEditingSettings(false);
  };

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
                setBankCashInput(((primaryBank?.balanceCents ?? settings.bankCashCents ?? 0) / 100).toString());
                setCreditOwedInput(((primaryCredit?.balanceCents ?? settings.creditCardOwedCents ?? 0) / 100).toString());
                setIncomeInput(((settings.monthlyIncomeCents || 0) / 100).toString());
                setFixedBillsInput(((settings.fixedBillsCents || 0) / 100).toString());
                setIsEditingSettings(!isEditingSettings);
              }}
              className="rounded-lg p-1 text-[#9e9a93] hover:bg-[#1a1d24] hover:text-[#d4af37] transition-colors"
              title="Quick Adjust Inflows & Cash"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#f5f3ef]">
              {displayMoney(totalNetWorthCents, displayCurrency || 'USD')}
            </span>
            {netWorthUnconverted.length > 0 && (
              <span
                className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30"
                title={`FX rates unavailable for: ${netWorthUnconverted.join(', ')}. Foreign amounts excluded from total to prevent silent mixing.`}
              >
                * Partial ({netWorthUnconverted.join(', ')})
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-[#9e9a93]">
            <span>Cash: <strong className="text-[#e5c07b]">{displayMoney(totalBankCashCents, displayCurrency || 'USD')}{bankCashUnconverted.length > 0 ? '*' : ''}</strong></span>
            <span className="text-[#3a3f4d]">•</span>
            <span>Funds: <strong className="text-[#d4af37]">{displayMoney(totalFundsCents, displayCurrency || 'USD')}{fundsUnconverted.length > 0 ? '*' : ''}</strong></span>
            <span className="text-[#3a3f4d]">•</span>
            <span>Inv: <strong className="text-gain">{displayMoney(totalInvestmentsCents, displayCurrency || 'USD')}{investmentsUnconverted.length > 0 ? '*' : ''}</strong></span>
            <span className="text-[#3a3f4d]">•</span>
            <span>Credit: <strong className="text-loss">{hideAmounts ? '' : '-'}{displayMoney(totalCreditOwedCents, displayCurrency || 'USD')}{creditOwedUnconverted.length > 0 ? '*' : ''}</strong></span>
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
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#4ade80]">
              {displayMoney(safeToSpendMonthCents, displayCurrency || 'USD')}
            </span>
            {safeToSpendUnconverted.length > 0 && (
              <span
                className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30"
                title={`FX rates unavailable for: ${safeToSpendUnconverted.join(', ')}`}
              >
                * Partial
              </span>
            )}
          </div>
          <p className="mt-4 text-[11px] text-[#9e9a93]">
            {safeToSpendUnconverted.length > 0
              ? `* Partial: rates unavailable for ${safeToSpendUnconverted.join(', ')}`
              : 'Income − Fixed bills − Sinking deposits − Debit spent'}
          </p>
          <div className="absolute right-0 top-0 h-1 w-full bg-[#22c55e]" />
        </div>

        {/* Monthly Cash Flow Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e222b] bg-[#111419]/80 p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-[#d4af37]/30">
          <div className="flex items-center justify-between text-xs text-[#9e9a93]">
            <span className="font-semibold uppercase tracking-wider text-[#f5f3ef]">Monthly Cash Flow</span>
            <div className="flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-medium text-[#4ade80] border border-[#22c55e]/25">
              <ArrowUpRight className="h-3 w-3" />
              <span>{displayPercent(savingsRatePct)} Saved</span>
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-[#f5f3ef]">
            {displayMoney(netSavedMonthCents, displayCurrency || 'USD')}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-[#9e9a93]">
            <span>Inflows: {displayMoney(totalMonthlyInflowsCents, displayCurrency || 'USD')}</span>
            <span>Outflows: {displayMoney(totalMonthlyOutflowCents, displayCurrency || 'USD')}</span>
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
            {displayMoney(totalFundsCents, displayCurrency || 'USD')}
          </div>
          <p className="mt-4 text-[11px] text-[#9e9a93]">
            Segregated from spendable cash across all sinking funds
          </p>
          <div className="absolute right-0 top-0 h-1 w-full bg-[#d4af37]" />
        </div>
      </div>

      {/* Honest Multi-Currency Partial Marker Banner (Item 4) */}
      {netWorthUnconverted.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>Partial Multi-Currency Totals:</strong> FX exchange rates are currently unavailable for{' '}
            <strong>{netWorthUnconverted.join(', ')}</strong>. Unconverted foreign-currency amounts are honestly excluded from totals to avoid silent 1:1 mixing.
          </span>
        </div>
      )}

      {/* 4-Bucket Exact Mathematical Reconciliation Strip */}
      <div className="rounded-xl border border-[#1e222b] bg-[#111419]/90 px-4 py-2.5 backdrop-blur-sm text-[11px] text-[#9e9a93] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-[#d4af37]" />
          <span className="font-semibold text-[#f5f3ef]">Net Worth Formula:</span>
          <span>
            <span className="text-[#e5c07b] font-medium">Bank/Cash ({displayMoney(totalBankCashCents, displayCurrency || 'USD')})</span> +{' '}
            <span className="text-[#d4af37] font-medium">Sinking Funds ({displayMoney(totalFundsCents, displayCurrency || 'USD')})</span> +{' '}
            <span className="text-gain font-medium">Investments ({displayMoney(totalInvestmentsCents, displayCurrency || 'USD')})</span> −{' '}
            <span className="text-loss font-medium">Credit Debt ({displayMoney(totalCreditOwedCents, displayCurrency || 'USD')})</span> ={' '}
            <strong className="text-[#f5f3ef]">{displayMoney(totalNetWorthCents, displayCurrency || 'USD')}</strong>
          </span>
        </div>
        <span className="text-[10px] text-[#716c64] font-mono">
          Integer-Cent Accuracy Guaranteed
        </span>
      </div>

      {/* Inline Quick Settings Editor */}
      {isEditingSettings && (
        <div className="rounded-2xl border border-[#262930] bg-[#171a21] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
              Adjust Vault Inflows & Fallback Balances
            </h4>
            <button
              onClick={() => setIsEditingSettings(false)}
              className="text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[11px] font-medium text-[#f5f3ef]">Liquid Bank Cash ($)</label>
              <input
                id="bank-cash-input"
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
