'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Fund, FundAllocation, FundAutoRule } from '@/lib/types';
import { formatMoney, SUPPORTED_CURRENCIES, convertCurrency } from '@/lib/currencies';
import {
  Plus,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  Coins,
  Repeat,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
  Pause,
  Play,
  X,
} from 'lucide-react';

export function FundsModule({ selectedFundId }: { selectedFundId?: string | null }) {
  const {
    funds,
    createFund,
    updateFund,
    deleteFund,
    fundAllocations,
    allocateFund,
    deleteFundAllocation,
    fundAutoRules,
    createFundAutoRule,
    toggleFundAutoRule,
    deleteFundAutoRule,
    accounts,
    displayCurrency,
    rates,
  } = useStore();

  const [activeFundId, setActiveFundId] = useState<string | null>(selectedFundId || null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [deleteConfirmFund, setDeleteConfirmFund] = useState<Fund | null>(null);
  const [deleteConfirmAlloc, setDeleteConfirmAlloc] = useState<FundAllocation | null>(null);
  const [allocError, setAllocError] = useState<string | null>(null);

  // Create Fund Form
  const [fundName, setFundName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [fundCurrency, setFundCurrency] = useState(displayCurrency || 'USD');

  // Edit Fund Form
  const [editName, setEditName] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');

  // Allocate Form (Fix 18: requires source bank/cash account)
  const [allocAmount, setAllocAmount] = useState('');
  const [allocType, setAllocType] = useState<'deposit' | 'withdraw'>('deposit');
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    accounts.find((a) => a.type === 'bank' || a.type === 'cash')?.id || accounts[0]?.id || ''
  );
  const [allocNote, setAllocNote] = useState('');

  // Auto-Rule Form
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleDay, setRuleDay] = useState('1');
  const [ruleSourceAccountId, setRuleSourceAccountId] = useState<string>(
    accounts.find((a) => a.type === 'bank' || a.type === 'cash')?.id || ''
  );

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
    await createFund(fundName.trim(), targetAmountCents, targetDate, fundCurrency);

    setFundName('');
    setTargetAmount('');
    setTargetDate('');
    setIsCreateModalOpen(false);
  };

  // Edit Fund Handler
  const handleStartEditFund = (f: Fund) => {
    setEditingFund(f);
    setEditName(f.name);
    setEditTargetAmount((f.targetAmountCents / 100).toFixed(2));
    setEditTargetDate(f.targetDate);
    setEditCurrency(f.currency || 'USD');
  };

  const handleSaveEditFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFund) return;
    const dollars = parseFloat(editTargetAmount);
    if (!editName || isNaN(dollars) || dollars <= 0 || !editTargetDate) return;

    await updateFund(editingFund.id, {
      name: editName.trim(),
      targetAmountCents: Math.round(dollars * 100),
      targetDate: editTargetDate,
      currency: editCurrency,
    });
    setEditingFund(null);
  };

  // Allocation Handler (Fix 18: Transfers Move Money with Rejection Rules)
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    setAllocError(null);

    const dollars = parseFloat(allocAmount);
    if (isNaN(dollars) || dollars <= 0) {
      setAllocError('Please enter a valid transfer amount.');
      return;
    }

    const cents = Math.round(dollars * 100);
    const result = await allocateFund(
      selectedFund.id,
      cents,
      allocType,
      sourceAccountId || undefined,
      allocNote.trim() || undefined
    );

    if (!result.success) {
      setAllocError(result.error || 'Transfer failed.');
      return;
    }

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
    await createFundAutoRule(selectedFund.id, cents, day, ruleSourceAccountId || undefined);

    setRuleAmount('');
    setIsRuleModalOpen(false);
  };

  const liquidAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === 'bank' || a.type === 'cash');
  }, [accounts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Funds & Goals (Sinking Funds)</h2>
          <p className="text-xs text-[#9e9a93]">
            Money with a job — segregated from spendable cash. Deposits move money out of accounts; withdrawals return money.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-3.5 py-2 text-xs font-semibold text-[#0b0d10] shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:brightness-110"
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
          if (fund.currency !== displayCurrency && rates[fund.currency]) {
            const conv = convertCurrency(fund.currentAmountCents, fund.currency, displayCurrency, rates);
            if (conv) {
              convertedDisplay = `≈ ${formatMoney(conv.convertedAmount, displayCurrency)} (FX converted)`;
            }
          }

          return (
            <div
              key={fund.id}
              onClick={() => setActiveFundId(fund.id)}
              className={`cursor-pointer rounded-2xl border p-5 shadow-lg backdrop-blur-md transition-all ${
                isSelected
                  ? 'border-gold bg-[#111419]/90 ring-1 ring-gold/40'
                  : 'border-[#262930] bg-[#111419]/70 hover:border-gold/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#f5f3ef]">{fund.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[#1e222b] px-2 py-0.5 text-[10px] font-semibold text-gold-light border border-gold/20">
                    {fund.currency}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditFund(fund);
                    }}
                    className="rounded p-1 text-[#9e9a93] hover:text-gold-light"
                    title="Edit Fund"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmFund(fund);
                    }}
                    className="rounded p-1 text-[#9e9a93] hover:text-rose-400"
                    title="Delete Fund"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Progress and Balances */}
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-[#f5f3ef]">
                  {formatMoney(fund.currentAmountCents, fund.currency)}
                </div>
                <div className="text-xs text-[#9e9a93]">
                  Target: {formatMoney(fund.targetAmountCents, fund.currency)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#1e222b]">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gold-light font-semibold">{pct}% saved</span>
                <span className="text-[#9e9a93]">Target: {fund.targetDate}</span>
              </div>

              {/* Monthly requirement */}
              <div className="mt-2 border-t border-[#262930] pt-2 text-[11px] text-[#9e9a93]">
                <span>Monthly needed: </span>
                <strong className="text-[#f5f3ef]">
                  {formatMoney(monthlyNeededCents, fund.currency)}/mo
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
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-6 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#262930] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#f5f3ef]">{selectedFund.name} Detail Ledger</h3>
                <span className="rounded bg-gold/10 px-2 py-0.5 text-xs text-gold-light font-medium border border-gold/30">
                  {selectedFund.currency}
                </span>
              </div>
              <p className="text-xs text-[#9e9a93]">
                Audit trail of deposits, withdrawals, and automated recurring rules with atomic account synchronization.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAllocType('deposit');
                  setAllocError(null);
                  setIsAllocateModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-3 py-1.5 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Deposit / Withdraw</span>
              </button>
              <button
                onClick={() => setIsRuleModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#262930] bg-[#171a21] px-3 py-1.5 text-xs font-medium text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
              >
                <Repeat className="h-4 w-4 text-gold-light" />
                <span>Add Auto-Rule</span>
              </button>
            </div>
          </div>

          {/* Active Auto-Rules for this fund */}
          {activeRules.length > 0 && (
            <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gold-light">
                <Repeat className="h-4 w-4" />
                <span>Active Auto-Rules (Catch-up runs on launch across all missed months)</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {activeRules.map((rule) => {
                  const srcAcc = accounts.find((a) => a.id === rule.sourceAccountId);
                  return (
                    <div key={rule.id} className="flex flex-col gap-1.5 rounded-lg border border-[#262930] bg-[#111419]/60 p-2.5 text-xs text-[#f5f3ef]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={rule.active ? '' : 'line-through text-[#716c64]'}>
                            Move {formatMoney(rule.amountCents, selectedFund.currency)} on day {rule.dayOfMonth}
                            {srcAcc ? ` from ${srcAcc.name}` : ''}
                          </span>
                          {!rule.active && (
                            <span className="rounded bg-[#262930] px-1.5 py-0.5 text-[10px] text-[#9e9a93]">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gold-light">
                            Last: {rule.lastAppliedDate || 'Pending first run'}
                          </span>
                          <button
                            onClick={() => toggleFundAutoRule(rule.id, !rule.active)}
                            className="rounded p-1 text-[#9e9a93] hover:text-[#f5f3ef]"
                            title={rule.active ? 'Pause Rule' : 'Resume Rule'}
                          >
                            {rule.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 text-gold-light" />}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete this automated recurring rule?')) {
                                await deleteFundAutoRule(rule.id);
                              }
                            }}
                            className="rounded p-1 text-rose-400 hover:text-rose-300"
                            title="Delete Rule"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {rule.lastSkippedNotice && (
                        <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                          <span>⚠️ {rule.lastSkippedNotice}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Allocations History */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9e9a93] mb-2">
              Transaction History
            </h4>
            <div className="divide-y divide-[#262930] rounded-xl border border-[#262930] bg-[#0b0d10]/60">
              {activeAllocations.length > 0 ? (
                activeAllocations.map((alloc) => {
                  const srcAcc = accounts.find((a) => a.id === alloc.sourceAccountId);
                  return (
                    <div key={alloc.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            alloc.type === 'deposit'
                              ? 'bg-gain/15 text-gain'
                              : 'bg-loss/15 text-loss'
                          }`}
                        >
                          {alloc.type === 'deposit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-[#f5f3ef] capitalize">
                            {alloc.type}
                            {srcAcc && <span className="font-normal text-[#9e9a93]"> ({srcAcc.name})</span>}
                          </div>
                          <div className="text-[11px] text-[#9e9a93]">
                            {alloc.date} {alloc.note && `• ${alloc.note}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`text-sm font-bold ${
                            alloc.type === 'deposit' ? 'text-gain' : 'text-loss'
                          }`}
                        >
                          {alloc.type === 'deposit' ? '+' : '-'}{formatMoney(alloc.amountCents, selectedFund.currency)}
                        </div>
                        <button
                          onClick={() => setDeleteConfirmAlloc(alloc)}
                          className="rounded p-1 text-[#716c64] hover:text-rose-400 transition-colors"
                          title="Delete Allocation (Reverses effect on fund & account)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#9e9a93]">
                  No allocations yet. Deposit funds from an account to start saving toward this goal.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#262930] bg-[#111419]/40 p-12 text-center text-xs text-[#9e9a93]">
          No sinking funds created. Click &quot;Create New Fund&quot; to set up an Emergency Fund, Vacation Fund, or House Fund.
        </div>
      )}

      {/* CREATE FUND MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Create Sinking Fund</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Money with a job — segregated from spendable cash.
            </p>

            <form onSubmit={handleCreateFund} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Fund Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, House Fund, Vacation"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Target Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={fundCurrency}
                    onChange={(e) => setFundCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Target Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Create Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FUND MODAL */}
      {editingFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Edit Sinking Fund</h3>
            <form onSubmit={handleSaveEditFund} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Fund Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Target Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Target Date</label>
                <input
                  type="date"
                  required
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFund(null)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE MODAL (Fix 18: requires source bank account + atomic balance checks) */}
      {isAllocateModalOpen && selectedFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Allocate Money: {selectedFund.name}</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Transfers move money between your chosen source account and this sinking fund.
            </p>

            {allocError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{allocError}</span>
              </div>
            )}

            <form onSubmit={handleAllocate} className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAllocType('deposit');
                    setAllocError(null);
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                    allocType === 'deposit'
                      ? 'bg-gradient-to-r from-gold to-gold-light text-[#0b0d10]'
                      : 'border border-[#262930] bg-[#0b0d10] text-[#9e9a93]'
                  }`}
                >
                  Deposit (Account → Fund)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAllocType('withdraw');
                    setAllocError(null);
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                    allocType === 'withdraw'
                      ? 'bg-loss text-white'
                      : 'border border-[#262930] bg-[#0b0d10] text-[#9e9a93]'
                  }`}
                >
                  Withdraw (Fund → Account)
                </button>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">
                  Source Account ({allocType === 'deposit' ? 'Deducted From' : 'Credited To'})
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {liquidAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — Balance: {formatMoney(a.balanceCents, a.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Amount ({selectedFund.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="100.00"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly transfer, bonus allocation"
                  value={allocNote}
                  onChange={(e) => setAllocNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Create Auto-Rule: {selectedFund.name}</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Rules execute on app launch with automatic catch-up across missed months.
            </p>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Source Account</label>
                <select
                  value={ruleSourceAccountId}
                  onChange={(e) => setRuleSourceAccountId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {liquidAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Monthly Transfer Amount ({selectedFund.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="200.00"
                  value={ruleAmount}
                  onChange={(e) => setRuleAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Day of Month (1 - 31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={ruleDay}
                  onChange={(e) => setRuleDay(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Save Auto-Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM FUND MODAL */}
      {deleteConfirmFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-[#f5f3ef]">Delete Sinking Fund</h4>
            <p className="mt-2 text-xs text-[#c8c4bc]">
              Are you sure you want to delete <strong className="text-gold-light">{deleteConfirmFund.name}</strong>?
            </p>
            <p className="mt-1 text-[11px] text-[#716c64]">
              This removes the fund and its target from your calculations. (Current balance: {formatMoney(deleteConfirmFund.currentAmountCents, deleteConfirmFund.currency)})
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmFund(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteFund(deleteConfirmFund.id);
                  setDeleteConfirmFund(null);
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Delete Fund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM ALLOCATION MODAL */}
      {deleteConfirmAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-[#f5f3ef]">Delete Allocation</h4>
            <p className="mt-2 text-xs text-[#c8c4bc]">
              Delete this {deleteConfirmAlloc.type} of <strong className="text-gold-light">{formatMoney(deleteConfirmAlloc.amountCents, selectedFund?.currency || 'USD')}</strong>?
            </p>
            <p className="mt-1 text-[11px] text-[#716c64]">
              This will automatically reverse the balance change on both the fund and the source account.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmAlloc(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteFundAllocation(deleteConfirmAlloc.id);
                  setDeleteConfirmAlloc(null);
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Reverse & Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
