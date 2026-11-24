'use client';

import React, { useState, useMemo } from 'react';
import { useStore, getLocalMonth } from '@/lib/store';
import { computeBudgetRolloverSummary } from '@/lib/financeHelpers';
import { parseToSmallestUnit } from '@/lib/currencies';
import { ArrowRightLeft, AlertTriangle, Trash2, X } from 'lucide-react';

export function BudgetRolloverPanel() {
  const {
    budgets,
    expenses,
    budgetTransfers,
    addBudgetTransfer,
    deleteBudgetTransfer,
    displayCurrency,
    rates,
    displayMoney,
  } = useStore();

  const currentMonth = getLocalMonth();
  const rows = useMemo(
    () =>
      computeBudgetRolloverSummary(
        budgets,
        expenses,
        budgetTransfers,
        currentMonth,
        displayCurrency || 'USD',
        rates
      ),
    [budgets, expenses, budgetTransfers, currentMonth, displayCurrency, rates]
  );

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromCat, setFromCat] = useState(budgets[0]?.category || '');
  const [toCat, setToCat] = useState(budgets[1]?.category || budgets[0]?.category || '');
  const [transferAmount, setTransferAmount] = useState('');

  const openCoverOverspend = (overspentCategory: string, overspentCents: number) => {
    const donor =
      rows.find((r) => r.category !== overspentCategory && r.remainingCents >= overspentCents) ||
      rows.find((r) => r.category !== overspentCategory && r.remainingCents > 0) ||
      rows.find((r) => r.category !== overspentCategory);
    setFromCat(donor?.category || '');
    setToCat(overspentCategory);
    setTransferAmount((overspentCents / 100).toFixed(2));
    setIsTransferOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseToSmallestUnit(transferAmount, displayCurrency || 'USD');
    if (!fromCat || !toCat || fromCat === toCat || cents <= 0) return;
    await addBudgetTransfer(fromCat, toCat, cents, currentMonth);
    setIsTransferOpen(false);
    setTransferAmount('');
  };

  const thisMonthTransfers = budgetTransfers.filter((t) => t.month === currentMonth);

  return (
    <div className="surface-3d rounded-2xl p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#f5f3ef]">
            Budget Rollover &amp; Overspend Coverage ({currentMonth})
          </h3>
          <p className="text-xs text-[#c2bdb4] mt-0.5">
            Unspent budget automatically rolls over from last month. Move money between categories anytime to cover overspending.
          </p>
        </div>
        {budgets.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              setFromCat(budgets[0]?.category || '');
              setToCat(budgets[1]?.category || '');
              setTransferAmount('');
              setIsTransferOpen(true);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-light hover:bg-gold/20"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Move Money Between Categories</span>
          </button>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.category}
              className={`well-3d rounded-xl p-4 space-y-2 ${
                r.overspentCents > 0 ? '!border-rose-500/45' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-[#f5f3ef]">{r.category}</span>
                {r.overspentCents > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    <AlertTriangle className="h-3 w-3" />
                    Overspent {displayMoney(r.overspentCents, displayCurrency)}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-emerald-400">
                    {displayMoney(r.remainingCents, displayCurrency)} left
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#c2bdb4]">
                <span>Base: {displayMoney(r.baseLimitCents, displayCurrency)}</span>
                {r.rolloverCents > 0 && (
                  <span className="text-emerald-400">
                    +{displayMoney(r.rolloverCents, displayCurrency)} rollover
                  </span>
                )}
                {r.transferNetCents !== 0 && (
                  <span className={r.transferNetCents > 0 ? 'text-gold-light' : 'text-amber-300'}>
                    {r.transferNetCents > 0 ? '+' : '-'}
                    {displayMoney(Math.abs(r.transferNetCents), displayCurrency)} moved
                  </span>
                )}
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e222b]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    r.overspentCents > 0 ? 'bg-rose-500' : 'bg-gold'
                  }`}
                  style={{ width: `${Math.min(100, r.pctUsed)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#9e9a93]">
                <span>
                  Spent: <strong className="text-[#f5f3ef]">{displayMoney(r.spentCents, displayCurrency)}</strong>
                </span>
                <span>Available: {displayMoney(r.availableCents, displayCurrency)}</span>
              </div>

              {r.overspentCents > 0 && budgets.length >= 2 && (
                <button
                  type="button"
                  onClick={() => openCoverOverspend(r.category, r.overspentCents)}
                  className="mt-1 w-full rounded-lg border border-rose-500/35 bg-rose-500/10 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20"
                >
                  Cover Overspend From Another Category
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#9e9a93]">Set a category budget below to enable monthly rollover.</p>
      )}

      {thisMonthTransfers.length > 0 && (
        <div className="pt-2 border-t border-[#1e222b]">
          <div className="text-[11px] font-semibold text-gold-light mb-2">
            Category Moves This Month ({thisMonthTransfers.length})
          </div>
          <div className="space-y-1.5">
            {thisMonthTransfers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-[#1e222b] bg-[#0b0d10]/60 px-3 py-1.5 text-xs"
              >
                <span className="text-[#c2bdb4]">
                  Moved <strong className="text-gold-light">{displayMoney(t.amountCents, displayCurrency)}</strong> from{' '}
                  <strong className="text-[#f5f3ef]">{t.fromCategory}</strong> →{' '}
                  <strong className="text-[#f5f3ef]">{t.toCategory}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => deleteBudgetTransfer(t.id)}
                  className="rounded p-1 text-[#9e9a93] hover:text-rose-400"
                  title="Undo move"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOVE MONEY MODAL */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#f5f3ef]">Move Budget Between Categories</h3>
              <button onClick={() => setIsTransferOpen(false)} className="text-[#9e9a93] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#c2bdb4]">From Category</label>
                <select
                  value={fromCat}
                  onChange={(e) => setFromCat(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {budgets.map((b) => (
                    <option key={b.category} value={b.category}>{b.category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#c2bdb4]">To Category</label>
                <select
                  value={toCat}
                  onChange={(e) => setToCat(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {budgets.map((b) => (
                    <option key={b.category} value={b.category}>{b.category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#c2bdb4]">Amount ({displayCurrency})</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="50.00"
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="rounded-xl px-4 py-2 text-[#9e9a93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Move Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
