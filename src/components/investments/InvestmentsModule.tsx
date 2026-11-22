'use client';

import React, { useState } from 'react';
import { useStore, formatDisplayDate } from '@/lib/store';
import { InvestmentEntry, InvestmentType } from '@/lib/types';
import { CURRENCY_REGISTRY, formatMoney, parseToSmallestUnit, fromSmallestUnit } from '@/lib/currencies';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Calendar,
  Layers,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export const INVESTMENT_TYPES: InvestmentType[] = [
  'Stocks',
  '401(k)',
  'Mutual Funds',
  'ETFs',
  'Crypto',
  'Bonds',
  'Other',
];

export function InvestmentsModule({ selectedId }: { selectedId?: string | null }) {
  const {
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    totalInvestmentsCents,
    displayCurrency,
    fxRatesMap,
    displayMoney,
  } = useStore();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InvestmentEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<InvestmentType>('Stocks');
  const [formLabel, setFormLabel] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState(displayCurrency || 'USD');

  // Open Edit Modal
  const openEditModal = (entry: InvestmentEntry) => {
    setEditingEntry(entry);
    setFormType(entry.type);
    setFormLabel(entry.label || '');
    setFormAmount(fromSmallestUnit(entry.amountCents, entry.currency).toString());
    setFormCurrency(entry.currency || 'USD');
  };

  // Handle Add Submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountUnits = parseToSmallestUnit(formAmount, formCurrency);
    if (amountUnits <= 0) return;

    await addInvestment(formLabel, formType, amountUnits, formCurrency);
    setFormLabel('');
    setFormAmount('');
    setIsAddModalOpen(false);
  };

  // Handle Edit Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const amountUnits = parseToSmallestUnit(formAmount, formCurrency);
    if (amountUnits < 0) return;

    await updateInvestment(editingEntry.id, {
      label: formLabel,
      type: formType,
      amountCents: amountUnits,
      currency: formCurrency,
    });
    setEditingEntry(null);
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingId) return;
    await deleteInvestment(deletingId);
    setDeletingId(null);
  };

  const deletingEntry = investments.find((i) => i.id === deletingId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#f5f3ef]">Investments</h2>
            <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-light border border-gold/30">
              Manual Totals Only
            </span>
          </div>
          <p className="mt-1 text-xs text-[#9e9a93]">
            Update amounts by hand when you check your external portfolio. Zero tracking, zero prices, zero growth claims.
          </p>
        </div>

        <button
          onClick={() => {
            setFormLabel('');
            setFormAmount('');
            setFormType('Stocks');
            setFormCurrency(displayCurrency || 'USD');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Investment</span>
        </button>
      </div>

      {/* Primary KPI Card: Total Portfolio Value */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gold">Total Investments</span>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-[#f5f3ef]">
              {displayMoney(totalInvestmentsCents, displayCurrency)}
            </div>
            <p className="mt-2 text-[11px] text-[#9e9a93]">
              Sum of all manual asset balances • Converted to {displayCurrency} using verified exchange rates
            </p>
          </div>
          <div className="rounded-xl border border-[#262930] bg-[#0b0d10]/80 p-3 text-xs text-[#9e9a93] space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span>Total Entries:</span>
              <strong className="text-[#f5f3ef]">{investments.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>FX Reference:</span>
              <span className="text-gold-light">{fxRatesMap?.asOfDate ? `As of ${fxRatesMap.asOfDate}` : 'Local Cache'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Investments List */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/80 p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f5f3ef]">Investment Holdings</h3>
          <span className="text-xs text-[#9e9a93]">{investments.length} Active Records</span>
        </div>

        {investments.length > 0 ? (
          <div className="divide-y divide-[#1e222b]">
            {investments.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-3 hover:bg-[#171a21]/50 px-3 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#f5f3ef] text-sm">
                      {entry.label || entry.type}
                    </span>
                    <span className="rounded bg-[#1e222b] px-2 py-0.5 text-[10px] font-medium text-gold-light">
                      {entry.type}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#9e9a93]">
                    <Calendar className="h-3 w-3 text-gold-light" />
                    <span>Updated: {formatDisplayDate(entry.lastUpdated)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <div className="text-base font-bold text-gold-light font-mono">
                      {displayMoney(entry.amountCents, entry.currency)}
                    </div>
                    {entry.currency !== displayCurrency && (
                      <div className="text-[10px] text-[#9e9a93]">
                        {entry.currency}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(entry)}
                      className="rounded-lg p-2 text-[#9e9a93] hover:bg-[#1e222b] hover:text-[#f5f3ef] transition-colors"
                      title="Edit Amount"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(entry.id)}
                      className="rounded-lg p-2 text-[#9e9a93] hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[#9e9a93]">
            <TrendingUp className="mx-auto h-8 w-8 text-[#262930] mb-2" />
            <p>No investment entries added yet.</p>
            <p className="mt-1 text-[11px] text-[#716c64]">
              Click &quot;Add Investment&quot; to enter your portfolio balances by hand.
            </p>
          </div>
        )}
      </div>

      {/* Add Investment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#1e222b] pb-3">
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Add Investment Entry</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#9e9a93] hover:text-[#f5f3ef]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#9e9a93]">Asset Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as InvestmentType)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Label / Short Name (Optional)</label>
                <input
                  type="text"
                  placeholder={`e.g. ${formType} or Vanguard Total Market`}
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Total Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {Object.keys(CURRENCY_REGISTRY).map((code) => (
                      <option key={code} value={code}>
                        {code} ({CURRENCY_REGISTRY[code].symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Investment Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#1e222b] pb-3">
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Edit Investment</h3>
              <button onClick={() => setEditingEntry(null)} className="text-[#9e9a93] hover:text-[#f5f3ef]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#9e9a93]">Asset Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as InvestmentType)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Label / Short Name</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Updated Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {Object.keys(CURRENCY_REGISTRY).map((code) => (
                      <option key={code} value={code}>
                        {code} ({CURRENCY_REGISTRY[code].symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-[#9e9a93]">
                Saving will update the &quot;last updated&quot; stamp to today&apos;s date.
              </p>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Update Amount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-semibold">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-[#9e9a93]">
              Are you sure you want to delete{' '}
              <strong className="text-[#f5f3ef]">{deletingEntry?.label || deletingEntry?.type}</strong>?
              This will permanently remove the record and adjust your total investments.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
