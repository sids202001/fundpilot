'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { RecurringExpense } from '@/lib/types';
import { parseToSmallestUnit, fromSmallestUnit, SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { calculateDebtPayoff } from '@/lib/financeHelpers';
import { TiltCard } from '@/components/3d-ui/TiltCard';
import { MagneticButton } from '@/components/3d-ui/MagneticButton';
import {
  Repeat,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Pause,
  Play,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

export function RecurringAndDebtPanel({ allCategories }: { allCategories: string[] }) {
  const {
    accounts,
    recurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    toggleRecurringExpense,
    deleteRecurringExpense,
    debtPlans,
    upsertDebtPlan,
    deleteDebtPlan,
    displayCurrency,
    displayMoney,
  } = useStore();

  // Recurring Expense Modal State
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecurringExpense | null>(null);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState(displayCurrency || 'USD');
  const [recCategory, setRecCategory] = useState(allCategories[0] || 'Housing & Utilities');
  const [recDay, setRecDay] = useState('1');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id || '');

  // Debt Payoff Plan Modal State
  const [editingDebtAccountId, setEditingDebtAccountId] = useState<string | null>(null);
  const [debtApr, setDebtApr] = useState('19.99');
  const [debtMonthlyPayment, setDebtMonthlyPayment] = useState('250');

  const creditAccounts = accounts.filter((a) => a.type === 'credit');

  const openNewRecurring = () => {
    setEditingRec(null);
    setRecName('');
    setRecAmount('');
    setRecCurrency(displayCurrency || 'USD');
    setRecCategory(allCategories.includes('Housing & Utilities') ? 'Housing & Utilities' : allCategories[0] || 'Miscellaneous');
    setRecDay('1');
    setRecAccountId(accounts[0]?.id || '');
    setIsRecModalOpen(true);
  };

  const openEditRecurring = (rec: RecurringExpense) => {
    setEditingRec(rec);
    setRecName(rec.name);
    setRecAmount(fromSmallestUnit(rec.amountCents, rec.currency).toString());
    setRecCurrency(rec.currency || displayCurrency || 'USD');
    setRecCategory(rec.category);
    setRecDay(rec.dayOfMonth.toString());
    setRecAccountId(rec.accountId || '');
    setIsRecModalOpen(true);
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseToSmallestUnit(recAmount, recCurrency);
    const day = parseInt(recDay, 10);
    if (!recName.trim() || amountCents <= 0 || isNaN(day)) return;

    if (editingRec) {
      await updateRecurringExpense(editingRec.id, {
        name: recName.trim(),
        amountCents,
        currency: recCurrency,
        category: recCategory,
        dayOfMonth: Math.max(1, Math.min(31, day)),
        accountId: recAccountId || undefined,
      });
    } else {
      await addRecurringExpense({
        name: recName.trim(),
        amountCents,
        currency: recCurrency,
        category: recCategory,
        dayOfMonth: Math.max(1, Math.min(31, day)),
        accountId: recAccountId || undefined,
      });
    }
    setIsRecModalOpen(false);
  };

  const openDebtPlanModal = (accountId: string) => {
    const existing = debtPlans.find((d) => d.accountId === accountId);
    setEditingDebtAccountId(accountId);
    setDebtApr(existing ? (existing.aprBps / 100).toFixed(2) : '19.99');
    setDebtMonthlyPayment(existing ? (existing.monthlyPaymentCents / 100).toFixed(2) : '250');
  };

  const handleSaveDebtPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebtAccountId) return;
    const aprVal = parseFloat(debtApr);
    const payVal = parseFloat(debtMonthlyPayment);
    if (isNaN(aprVal) || aprVal < 0 || isNaN(payVal) || payVal <= 0) return;
    await upsertDebtPlan(editingDebtAccountId, Math.round(aprVal * 100), Math.round(payVal * 100));
    setEditingDebtAccountId(null);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: RECURRING EXPENSES */}
      <div className="surface-3d rounded-2xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Recurring Expenses</h3>
            </div>
            <p className="text-xs text-[#c2bdb4] mt-0.5">
              Auto-posts monthly on the scheduled day and updates the linked account balance. Cancelling stops future posts while keeping already-posted entries.
            </p>
          </div>
          <MagneticButton
            type="button"
            onClick={openNewRecurring}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-3.5 py-2 text-xs font-semibold text-[#0b0d10] shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Recurring</span>
          </MagneticButton>
        </div>

        {recurringExpenses.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recurringExpenses.map((rec) => {
              const acc = accounts.find((a) => a.id === rec.accountId);
              return (
                <TiltCard
                  key={rec.id}
                  maxTilt={3.5}
                  className={`card-3d rounded-xl p-4 ${rec.active ? '' : 'opacity-65'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#f5f3ef]">{rec.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            rec.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-[#1e222b] text-[#9e9a93] border-[#262930]'
                          }`}
                        >
                          {rec.active ? 'Active' : 'Cancelled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#c2bdb4] mt-1">
                        {rec.category} • Day {rec.dayOfMonth} monthly
                      </p>
                      {acc && (
                        <p className="text-[10px] text-[#9e9a93] mt-0.5">Account: {acc.name}</p>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-gold-light text-sm">
                      {displayMoney(rec.amountCents, rec.currency)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#1e222b] flex items-center justify-between text-[11px]">
                    <span className="text-[#9e9a93]">
                      {rec.lastPostedMonth ? `Last posted: ${rec.lastPostedMonth}` : 'Scheduled'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleRecurringExpense(rec.id, !rec.active)}
                        className="rounded-lg p-1.5 text-[#c2bdb4] hover:bg-[#1e222b] hover:text-gold-light"
                        title={rec.active ? 'Cancel future posts (keeps posted)' : 'Resume recurring'}
                      >
                        {rec.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditRecurring(rec)}
                        className="rounded-lg p-1.5 text-[#c2bdb4] hover:bg-[#1e222b] hover:text-[#f5f3ef]"
                        title="Edit Recurring Expense"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecurringExpense(rec.id)}
                        className="rounded-lg p-1.5 text-[#c2bdb4] hover:bg-rose-500/10 hover:text-rose-400"
                        title="Delete Rule (keeps posted entries)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        ) : (
          <div className="well-3d rounded-xl py-8 px-4 text-center text-xs text-[#c2bdb4]">
            No recurring expenses yet. Add rent, utilities, or memberships to post automatically each month.
          </div>
        )}
      </div>

      {/* SECTION 2: CREDIT CARD DEBT PAYOFF PLANS */}
      <div className="surface-3d rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Credit Card Debt Payoff Plans</h3>
            </div>
            <p className="text-xs text-[#c2bdb4] mt-0.5">
              Set APR and monthly payment per credit card to calculate exact months to payoff and total interest.
            </p>
          </div>
        </div>

        {creditAccounts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {creditAccounts.map((card) => {
              const plan = debtPlans.find((d) => d.accountId === card.id);
              const calc = plan
                ? calculateDebtPayoff(card.balanceCents, plan.aprBps, plan.monthlyPaymentCents)
                : null;

              return (
                <TiltCard key={card.id} maxTilt={3.5} className="card-3d rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-[#f5f3ef]">{card.name}</h4>
                      <p className="text-xs text-[#c2bdb4] mt-0.5">
                        Current Balance:{' '}
                        <strong className="text-rose-400 font-mono">
                          {displayMoney(card.balanceCents, card.currency)}
                        </strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDebtPlanModal(card.id)}
                        className="rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold-light hover:bg-gold/20"
                      >
                        {plan ? 'Edit Plan' : 'Set Plan'}
                      </button>
                      {plan && (
                        <button
                          type="button"
                          onClick={() => deleteDebtPlan(plan.id)}
                          className="rounded-lg p-1.5 text-[#9e9a93] hover:bg-rose-500/10 hover:text-rose-400"
                          title="Cancel Debt Payoff Plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {plan && calc ? (
                    <div className="mt-3 well-3d rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#c2bdb4]">
                        <span>APR: <strong className="text-[#f5f3ef]">{(plan.aprBps / 100).toFixed(2)}%</strong></span>
                        <span>Monthly Payment: <strong className="text-gold-light font-mono">{displayMoney(plan.monthlyPaymentCents, card.currency)}</strong></span>
                      </div>

                      {calc.canPayOff ? (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e222b]">
                          <div>
                            <div className="text-[10px] text-[#9e9a93]">Months Left</div>
                            <div className="font-bold text-[#f5f3ef]">{calc.months} mos</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#9e9a93]">Payoff Date</div>
                            <div className="font-bold text-emerald-400">{calc.payoffDateLabel}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#9e9a93]">Total Interest</div>
                            <div className="font-bold text-rose-400 font-mono">
                              {displayMoney(calc.totalInterestCents, card.currency)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Payment is too low to cover monthly interest ({displayMoney(calc.minInterestCents, card.currency)}/mo).
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-[#9e9a93]">
                      No payoff plan set. Click &ldquo;Set Plan&rdquo; to enter APR and monthly payment.
                    </p>
                  )}
                </TiltCard>
              );
            })}
          </div>
        ) : (
          <div className="well-3d rounded-xl py-6 px-4 text-center text-xs text-[#c2bdb4]">
            Add a Credit Card account in Settings to configure a debt payoff plan.
          </div>
        )}
      </div>

      {/* ADD / EDIT RECURRING EXPENSE MODAL */}
      {isRecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#f5f3ef]">
                {editingRec ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
              </h3>
              <button onClick={() => setIsRecModalOpen(false)} className="text-[#9e9a93] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRecurring} className="space-y-3 text-xs">
              <div>
                <label className="text-[#c2bdb4]">Name (e.g. Rent, Internet)</label>
                <input
                  type="text"
                  required
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  placeholder="Monthly Rent"
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#c2bdb4]">Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="1500.00"
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#c2bdb4]">Day of Month (1–31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={recDay}
                    onChange={(e) => setRecDay(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#c2bdb4]">Category</label>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#c2bdb4]">Currency</label>
                  <select
                    value={recCurrency}
                    onChange={(e) => setRecCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[#c2bdb4]">Account (auto-updated when posted)</label>
                <select
                  value={recAccountId}
                  onChange={(e) => setRecAccountId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  <option value="">None (track only)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-[#9e9a93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  {editingRec ? 'Save Changes' : 'Create Recurring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEBT PAYOFF PLAN MODAL */}
      {editingDebtAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#f5f3ef]">Credit Card Debt Payoff Plan</h3>
              <button onClick={() => setEditingDebtAccountId(null)} className="text-[#9e9a93] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDebtPlan} className="space-y-3 text-xs">
              <div>
                <label className="text-[#c2bdb4]">Annual Interest Rate (APR %)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={debtApr}
                  onChange={(e) => setDebtApr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[#c2bdb4]">Planned Monthly Payment ($)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={debtMonthlyPayment}
                  onChange={(e) => setDebtMonthlyPayment(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDebtAccountId(null)}
                  className="rounded-xl px-4 py-2 text-[#9e9a93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
