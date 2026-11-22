'use client';

import React, { useState, useMemo } from 'react';
import { useStore, getLocalDate, getLocalMonth } from '@/lib/store';
import { BillReminder } from '@/lib/types';
import { formatMoney, parseToSmallestUnit, fromSmallestUnit, CURRENCY_REGISTRY } from '@/lib/currencies';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  Edit2,
  Trash2,
  X,
  Check,
} from 'lucide-react';

export function BillsCard() {
  const { bills, addBill, updateBill, toggleBillActive, markBillPaid, deleteBill, displayCurrency, displayMoney } = useStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCurrency, setBillCurrency] = useState(displayCurrency || 'USD');
  const [billDueDay, setBillDueDay] = useState('1');

  const currentMonthStr = getLocalMonth();
  const today = new Date();
  const currentDay = today.getDate();

  // Categorize bills: Due Next 7 Days, Past Due This Month, Other Active
  const { dueNext7Days, pastDueThisMonth, upcomingOrPaid } = useMemo(() => {
    const dueNext: BillReminder[] = [];
    const pastDue: BillReminder[] = [];
    const others: BillReminder[] = [];

    const activeBills = bills.filter((b) => b.active);

    for (const b of activeBills) {
      const isPaidThisMonth = (b.paidMonths || []).includes(currentMonthStr);
      if (isPaidThisMonth) {
        others.push(b);
        continue;
      }

      // Check shorter month clamp (e.g. Feb 28, April 30)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const effectiveDueDay = Math.min(b.dueDay, lastDayOfMonth);

      if (effectiveDueDay < currentDay) {
        pastDue.push(b);
      } else if (effectiveDueDay >= currentDay && effectiveDueDay <= currentDay + 7) {
        dueNext.push(b);
      } else {
        others.push(b);
      }
    }

    return { dueNext7Days: dueNext, pastDueThisMonth: pastDue, upcomingOrPaid: others };
  }, [bills, currentMonthStr, currentDay, today]);

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountUnits = parseToSmallestUnit(billAmount, billCurrency);
    const day = parseInt(billDueDay, 10);
    if (!billName.trim() || amountUnits <= 0 || isNaN(day)) return;

    await addBill(billName.trim(), amountUnits, billCurrency, day);
    setBillName('');
    setBillAmount('');
    setIsAddModalOpen(false);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    const amountUnits = parseToSmallestUnit(billAmount, billCurrency);
    const day = parseInt(billDueDay, 10);
    if (!billName.trim() || amountUnits <= 0 || isNaN(day)) return;

    await updateBill(editingBill.id, {
      name: billName.trim(),
      amountCents: amountUnits,
      currency: billCurrency,
      dueDay: day,
    });
    setEditingBill(null);
  };

  const openEdit = (b: BillReminder) => {
    setEditingBill(b);
    setBillName(b.name);
    setBillAmount(fromSmallestUnit(b.amountCents, b.currency).toString());
    setBillCurrency(b.currency);
    setBillDueDay(b.dueDay.toString());
  };

  return (
    <div className="rounded-2xl border border-[#262930] bg-[#111419]/80 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold text-[#f5f3ef]">Bill Reminders</h3>
        </div>
        <button
          onClick={() => {
            setBillName('');
            setBillAmount('');
            setBillCurrency(displayCurrency || 'USD');
            setBillDueDay('1');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1 rounded-lg border border-[#262930] bg-[#0b0d10] px-2.5 py-1 text-xs text-gold-light hover:border-gold hover:bg-[#1e222b]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Bill</span>
        </button>
      </div>

      <p className="text-[11px] text-[#9e9a93] mb-4">
        Local manual reminders only. Marking paid records paid-for-this-month with NO automatic balance movement or expense creation.
        Due days 29–31 automatically fall on the last day of shorter months.
      </p>

      {/* Due Next 7 Days Alert */}
      {dueNext7Days.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-2">
            <Clock className="h-4 w-4" />
            <span>Due in the Next 7 Days ({dueNext7Days.length})</span>
          </div>
          <div className="space-y-2">
            {dueNext7Days.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs text-[#f5f3ef] bg-[#0b0d10]/60 p-2 rounded-lg">
                <div>
                  <span className="font-semibold">{b.name}</span>
                  <span className="text-[#9e9a93] text-[11px] ml-2">Due on Day {b.dueDay}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-amber-300">{displayMoney(b.amountCents, b.currency)}</span>
                  <button
                    onClick={() => markBillPaid(b.id, currentMonthStr)}
                    className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/30"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Due Alert */}
      {pastDueThisMonth.length > 0 && (
        <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Past Due This Month ({pastDueThisMonth.length})</span>
          </div>
          <div className="space-y-2">
            {pastDueThisMonth.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs text-[#f5f3ef] bg-[#0b0d10]/60 p-2 rounded-lg">
                <div>
                  <span className="font-semibold">{b.name}</span>
                  <span className="text-rose-400 text-[11px] ml-2">Day {b.dueDay} (Past Due)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-rose-300">{displayMoney(b.amountCents, b.currency)}</span>
                  <button
                    onClick={() => markBillPaid(b.id, currentMonthStr)}
                    className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/30"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Bills List */}
      <div className="divide-y divide-[#1e222b] mt-3">
        {bills.length > 0 ? (
          bills.map((b) => {
            const isPaid = (b.paidMonths || []).includes(currentMonthStr);
            return (
              <div key={b.id} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markBillPaid(b.id, currentMonthStr)}
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                      isPaid ? 'border-emerald-500 bg-emerald-500 text-[#0b0d10]' : 'border-[#262930] hover:border-gold'
                    }`}
                    title={isPaid ? 'Mark as Unpaid' : 'Mark as Paid this month'}
                  >
                    {isPaid && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <span className={`font-semibold ${isPaid ? 'line-through text-[#9e9a93]' : 'text-[#f5f3ef]'}`}>
                    {b.name}
                  </span>
                  <span className="text-[10px] text-[#9e9a93]">
                    Day {b.dueDay} • {b.active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-gold-light">{displayMoney(b.amountCents, b.currency)}</span>
                  <button
                    onClick={() => toggleBillActive(b.id, !b.active)}
                    className="text-[#9e9a93] hover:text-[#f5f3ef]"
                    title={b.active ? 'Pause Bill' : 'Resume Bill'}
                  >
                    {b.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                  <button onClick={() => openEdit(b)} className="text-[#9e9a93] hover:text-[#f5f3ef]" title="Edit Bill">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeletingId(b.id)} className="text-[#9e9a93] hover:text-rose-400" title="Delete Bill">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-[#9e9a93]">No bills recorded. Click &quot;Add Bill&quot; to track monthly dues.</div>
        )}
      </div>

      {/* Add / Edit Bill Modal */}
      {(isAddModalOpen || editingBill) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#1e222b] pb-2">
              <h3 className="text-sm font-semibold text-[#f5f3ef]">{editingBill ? 'Edit Bill' : 'Add Bill Reminder'}</h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingBill(null);
                }}
                className="text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={editingBill ? handleEditSubmit : handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Bill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric Utility or Gym"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#9e9a93]">Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={billCurrency}
                    onChange={(e) => setBillCurrency(e.target.value)}
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

              <div>
                <label className="text-xs text-[#9e9a93]">Due Day of Month (1 - 31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={billDueDay}
                  onChange={(e) => setBillDueDay(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-[#9e9a93]">Days 29–31 fall on the last day of shorter months.</p>
              </div>

              <div className="mt-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingBill(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Save Bill
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
            <h3 className="text-sm font-semibold text-rose-400 mb-2">Delete Bill</h3>
            <p className="text-xs text-[#9e9a93]">
              Are you sure you want to delete this bill reminder?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-xl px-4 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteBill(deletingId);
                  setDeletingId(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
