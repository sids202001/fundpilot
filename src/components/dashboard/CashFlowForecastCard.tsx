'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { buildThreeMonthForecast } from '@/lib/financeHelpers';
import { TiltCard } from '@/components/3d-ui/TiltCard';
import { CalendarDays, SlidersHorizontal } from 'lucide-react';

export function CashFlowForecastCard() {
  const {
    totalBankCashCents,
    settings,
    bills,
    recurringExpenses,
    fundAutoRules,
    accounts,
    funds,
    displayCurrency,
    rates,
    displayMoney,
  } = useStore();

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const [whatIfIncome, setWhatIfIncome] = useState('0');
  const [whatIfMonthlyExp, setWhatIfMonthlyExp] = useState('0');
  const [whatIfOneTime, setWhatIfOneTime] = useState('0');

  const forecastDays = useMemo(() => {
    const extraInc = Math.max(0, Math.round((parseFloat(whatIfIncome) || 0) * 100));
    const extraExp = Math.max(0, Math.round((parseFloat(whatIfMonthlyExp) || 0) * 100));
    const oneTime = Math.max(0, Math.round((parseFloat(whatIfOneTime) || 0) * 100));

    return buildThreeMonthForecast({
      startingCashCents: totalBankCashCents,
      monthlyIncomeCents: settings.monthlyIncomeCents || 0,
      fixedBillsCents: settings.fixedBillsCents || 0,
      bills,
      recurringExpenses,
      fundAutoRules,
      accounts,
      funds,
      displayCurrency: displayCurrency || 'USD',
      rates,
      whatIfExtraIncomeCents: extraInc,
      whatIfExtraExpenseCents: extraExp,
      whatIfOneTimeExpenseCents: oneTime,
    });
  }, [
    totalBankCashCents,
    settings.monthlyIncomeCents,
    settings.fixedBillsCents,
    bills,
    recurringExpenses,
    fundAutoRules,
    accounts,
    funds,
    displayCurrency,
    rates,
    whatIfIncome,
    whatIfMonthlyExp,
    whatIfOneTime,
  ]);

  // Group 90 days by YYYY-MM
  const monthGroups = useMemo(() => {
    const groups: Array<{ monthStr: string; label: string; days: typeof forecastDays }> = [];
    for (const d of forecastDays) {
      let grp = groups.find((g) => g.monthStr === d.monthStr);
      if (!grp) {
        const [y, m] = d.monthStr.split('-');
        const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        grp = {
          monthStr: d.monthStr,
          label: dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          days: [],
        };
        groups.push(grp);
      }
      grp.days.push(d);
    }
    return groups.slice(0, 3);
  }, [forecastDays]);

  const activeGroup = monthGroups[Math.min(selectedMonthIdx, monthGroups.length - 1)] || monthGroups[0];
  const endBalanceCents = forecastDays[forecastDays.length - 1]?.balanceCents ?? totalBankCashCents;
  const lowestDay = forecastDays.reduce(
    (min, d) => (d.balanceCents < min.balanceCents ? d : min),
    forecastDays[0]
  );

  return (
    <TiltCard maxTilt={2.5} className="card-3d rounded-2xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <h3 className="text-sm font-semibold text-[#f5f3ef]">3-Month Cash-Flow Forecast</h3>
            <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-light border border-gold/25">
              Projection Only — Nothing Auto-Posts
            </span>
          </div>
          <p className="text-xs text-[#c2bdb4] mt-0.5">
            Day-by-day projected liquid cash from balances + monthly income + bills + recurring expenses + fund deposits.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-[#9e9a93]">90-Day Projected</div>
            <div className={`font-bold font-mono ${endBalanceCents < 0 ? 'text-rose-400' : 'text-gold-light'}`}>
              {displayMoney(endBalanceCents, displayCurrency)}
            </div>
          </div>
          {lowestDay && (
            <div className="text-right border-l border-[#1e222b] pl-3">
              <div className="text-[10px] text-[#9e9a93]">Lowest ({lowestDay.dateStr.slice(5)})</div>
              <div className={`font-bold font-mono ${lowestDay.balanceCents < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {displayMoney(lowestDay.balanceCents, displayCurrency)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What-If Simulator Controls */}
      <div className="well-3d rounded-xl p-3 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gold-light mb-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>What-If Scenario (does not save or modify real balances)</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-xs">
          <div>
            <label className="text-[10px] text-[#c2bdb4]">+ Extra Monthly Income ($)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={whatIfIncome}
              onChange={(e) => setWhatIfIncome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#262930] bg-[#0b0d10] px-2.5 py-1.5 text-xs text-emerald-400 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#c2bdb4]">- Extra Monthly Expense ($)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={whatIfMonthlyExp}
              onChange={(e) => setWhatIfMonthlyExp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#262930] bg-[#0b0d10] px-2.5 py-1.5 text-xs text-rose-300 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#c2bdb4]">- One-Time Expense Today ($)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={whatIfOneTime}
              onChange={(e) => setWhatIfOneTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#262930] bg-[#0b0d10] px-2.5 py-1.5 text-xs text-amber-300 focus:border-gold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Month Switcher Tabs */}
      <div className="flex items-center gap-1.5 mb-3">
        {monthGroups.map((g, idx) => (
          <button
            key={g.monthStr}
            type="button"
            onClick={() => setSelectedMonthIdx(idx)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
              idx === selectedMonthIdx
                ? 'bg-gold/20 text-gold-light border border-gold/40'
                : 'border border-[#1e222b] bg-[#0b0d10]/60 text-[#9e9a93] hover:text-[#f5f3ef]'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Day-by-Day Calendar Grid */}
      {activeGroup && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {activeGroup.days.map((d) => {
            const hasEvents = d.events.length > 0;
            const tooltip = hasEvents
              ? d.events.map((ev) => `${ev.label}: ${ev.deltaCents >= 0 ? '+' : '-'}${displayMoney(Math.abs(ev.deltaCents), displayCurrency)}`).join(' | ')
              : 'No scheduled cash events';

            return (
              <div
                key={d.dateStr}
                title={`${d.dateStr} — ${tooltip}`}
                className={`rounded-lg border p-2 text-[10px] transition-colors ${
                  d.balanceCents < 0
                    ? 'border-rose-500/40 bg-rose-500/10'
                    : hasEvents
                    ? 'border-gold/35 bg-gold/[0.06]'
                    : 'border-[#1e222b] bg-[#0b0d10]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#c2bdb4]">{d.dayOfMonth}</span>
                  {hasEvents && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        d.events.some((e) => e.deltaCents > 0) ? 'bg-emerald-400' : 'bg-gold'
                      }`}
                    />
                  )}
                </div>
                <div
                  className={`mt-1 truncate font-mono font-semibold text-[10px] ${
                    d.balanceCents < 0 ? 'text-rose-300' : 'text-[#f5f3ef]'
                  }`}
                >
                  {displayMoney(d.balanceCents, displayCurrency)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TiltCard>
  );
}
