'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Fund, FundAllocation, FundAutoRule } from '@/lib/types';
import {
  Plus,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  Sparkles,
  Coins,
  Repeat,
  Check,
  AlertCircle,
} from 'lucide-react';

export function FundsModule({ selectedFundId }: { selectedFundId?: string | null }) {
  const {
    funds,
    createFund,
    fundAllocations,
    allocateFund,
    fundAutoRules,
    createFundAutoRule,
    fxRate,
  } = useStore();

  const [activeFundId, setActiveFundId] = useState<string | null>(selectedFundId || null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Create Fund Form
  const [fundName, setFundName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');

  // Allocate Form
  const [allocAmount, setAllocAmount] = useState('');
  const [allocType, setAllocType] = useState<'deposit' | 'withdraw'>('deposit');
  const [allocNote, setAllocNote] = useState('');

  // Auto-Rule Form
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleDay, setRuleDay] = useState('1');

  const selectedFund = useMemo(() => {
    return funds.find((f) => f.id === activeFundId) || funds[0] || null;
  }, [funds, activeFundId]);

  const activeAllocations = useMemo(() => {
    if (!selectedFund) return [];
    return fundAllocations.filter((a) => a.fundId === selectedFund.id);
  }, [fundAllocations, selectedFund]);

  const activeRules = useMemo(() => {
    if (!selectedFund) return [];
    return fundAutoRules.filter((r) => r.fundId === selectedFund.id);
  }, [fundAutoRules, selectedFund]);

  // Create Fund Handler
  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(targetAmount);
    if (!fundName || isNaN(dollars) || dollars <= 0 || !targetDate) return;

    const targetAmountCents = Math.round(dollars * 100);
    await createFund(fundName.trim(), targetAmountCents, targetDate, currency);

    setFundName('');
    setTargetAmount('');
    setTargetDate('');
    setIsCreateModalOpen(false);
  };

  // Allocation Handler
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const dollars = parseFloat(allocAmount);
    if (isNaN(dollars) || dollars <= 0) return;

    const cents = Math.round(dollars * 100);
    await allocateFund(selectedFund.id, cents, allocType, allocNote.trim() || undefined);

    setAllocAmount('');
    setAllocNote('');
    setIsAllocateModalOpen(false);
  };

  // Auto-Rule Handler
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const dollars = parseFloat(ruleAmount);
    const day = parseInt(ruleDay, 10);
    if (isNaN(dollars) || dollars <= 0 || isNaN(day) || day < 1 || day > 31) return;

    const cents = Math.round(dollars * 100);
    await createFundAutoRule(selectedFund.id, cents, day);

    setRuleAmount('');
    setIsRuleModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Funds & Goals (Sinking Funds)</h2>
          <p className="text-xs text-slate-400">
            Money with a job — segregated from spendable cash. Automated monthly allocations on app launch.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Fund</span>
        </button>
      </div>

      {/* Sinking Funds Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {funds.map((fund) => {
          const isSelected = selectedFund?.id === fund.id;
          const ratio = fund.targetAmountCents > 0 ? fund.currentAmountCents / fund.targetAmountCents : 0;
          const pct = Math.min(100, Math.round(ratio * 100));

          // Calculate required monthly contribution to hit target date
          const today = new Date();
          const targetD = new Date(fund.targetDate);
          const diffMonths = Math.max(1, (targetD.getFullYear() - today.getFullYear()) * 12 + (targetD.getMonth() - today.getMonth()));
          const remainingCents = Math.max(0, fund.targetAmountCents - fund.currentAmountCents);
          const monthlyNeededCents = Math.round(remainingCents / diffMonths);

          // Multi-currency calculation
          let convertedDisplay = null;
          if (fund.currency === 'INR' && fxRate && fxRate.rate > 0) {
            const usdVal = fund.currentAmountCents / 100 / fxRate.rate;
            convertedDisplay = `≈ $${usdVal.toFixed(2)} USD (Rate: ₹${fxRate.rate.toFixed(2)} as of ${fxRate.asOfDate})`;
          } else if (fund.currency === 'USD' && fxRate && fxRate.rate > 0) {
            const inrVal = (fund.currentAmountCents / 100) * fxRate.rate;
            convertedDisplay = `≈ ₹${inrVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR (Rate: ₹${fxRate.rate.toFixed(2)} as of ${fxRate.asOfDate})`;
          }

          return (
            <div
              key={fund.id}
              onClick={() => setActiveFundId(fund.id)}
              className={`cursor-pointer rounded-2xl border p-5 shadow-lg backdrop-blur-md transition-all ${
                isSelected
                  ? 'border-teal-500 bg-slate-900/90 ring-1 ring-teal-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{fund.name}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                  {fund.currency}
                </span>
              </div>

              {/* Progress and Balances */}
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-white">
                  {fund.currency === 'USD' ? '$' : '₹'}
                  {(fund.currentAmountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400">
                  Target: {fund.currency === 'USD' ? '$' : '₹'}
                  {(fund.targetAmountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-teal-400 font-semibold">{pct}% saved</span>
                <span className="text-slate-400">Target: {fund.targetDate}</span>
              </div>

              {/* Monthly requirement */}
              <div className="mt-2 border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                <span>Monthly needed: </span>
                <strong className="text-white">
                  {fund.currency === 'USD' ? '$' : '₹'}
                  {(monthlyNeededCents / 100).toFixed(0)}/mo
                </strong>
                <span> to hit date in {diffMonths} mos</span>
              </div>

              {/* Multi-currency label */}
              {convertedDisplay && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400/90">
                  <Coins className="h-3 w-3 shrink-0" />
                  <span>{convertedDisplay}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Fund Detail & Allocation Ledger */}
      {selectedFund ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{selectedFund.name} Detail Ledger</h3>
                <span className="rounded bg-teal-500/10 px-2 py-0.5 text-xs text-teal-400 font-medium">
                  {selectedFund.currency}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit trail of all deposits, withdrawals, and automated recurring rules.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAllocType('deposit');
                  setIsAllocateModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400"
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Deposit / Withdraw</span>
              </button>
              <button
                onClick={() => setIsRuleModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <Repeat className="h-4 w-4 text-teal-400" />
                <span>Add Auto-Rule</span>
              </button>
            </div>
          </div>

          {/* Active Auto-Rules for this fund */}
          {activeRules.length > 0 && (
            <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <Repeat className="h-4 w-4" />
                <span>Active Auto-Rules (Catch-up runs on launch)</span>
              </div>
              <div className="mt-2 space-y-1">
                {activeRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between text-xs text-indigo-200">
                    <span>
                      Move ${ (rule.amountCents / 100).toFixed(2) } on the {rule.dayOfMonth}th of every month
                    </span>
                    <span className="text-[11px] text-indigo-400">
                      Last applied: {rule.lastAppliedDate || 'Pending first run'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allocations History */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Transaction History
            </h4>
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40">
              {activeAllocations.length > 0 ? (
                activeAllocations.map((alloc) => (
                  <div key={alloc.id} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          alloc.type === 'deposit'
                            ? 'bg-teal-500/15 text-teal-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {alloc.type === 'deposit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-white capitalize">{alloc.type}</div>
                        <div className="text-[11px] text-slate-400">
                          {alloc.date} {alloc.note && `• ${alloc.note}`}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        alloc.type === 'deposit' ? 'text-teal-400' : 'text-rose-400'
                      }`}
                    >
                      {alloc.type === 'deposit' ? '+' : '-'}${(alloc.amountCents / 100).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No allocations yet. Deposit funds to start saving towards this goal.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-xs text-slate-500">
          No sinking funds created. Click &quot;Create New Fund&quot; to set up an Emergency Fund, Vacation Fund, or Investment Fund.
        </div>
      )}

      {/* CREATE FUND MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Sinking Fund</h3>
            <p className="mt-1 text-xs text-slate-400">
              Money with a job — segregated from spendable cash.
            </p>

            <form onSubmit={handleCreateFund} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400">Fund Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, House Fund, Vacation"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Target Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Target Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
                >
                  Create Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE MODAL */}
      {isAllocateModalOpen && selectedFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Allocate Money: {selectedFund.name}</h3>
            <form onSubmit={handleAllocate} className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllocType('deposit')}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                    allocType === 'deposit'
                      ? 'bg-teal-500 text-slate-950'
                      : 'border border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setAllocType('withdraw')}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                    allocType === 'withdraw'
                      ? 'bg-rose-500 text-white'
                      : 'border border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400">Amount ({selectedFund.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="100.00"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly transfer, bonus allocation"
                  value={allocNote}
                  onChange={(e) => setAllocNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTO-RULE MODAL */}
      {isRuleModalOpen && selectedFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Auto-Rule: {selectedFund.name}</h3>
            <p className="mt-1 text-xs text-slate-400">
              E.g. &quot;Move $200 on the 1st of every month&quot;. Rules execute on app launch with automatic catch-up.
            </p>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400">Monthly Transfer Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="200.00"
                  value={ruleAmount}
                  onChange={(e) => setRuleAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Day of Month (1 - 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={ruleDay}
                  onChange={(e) => setRuleDay(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
                >
                  Save Auto-Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
