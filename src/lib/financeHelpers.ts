import {
  Account,
  BillReminder,
  BudgetTransfer,
  CategoryBudget,
  Expense,
  Fund,
  FundAllocation,
  FundAutoRule,
  RecurringExpense,
} from './types';
import { convertCurrency } from './currencies';

/**
 * Part B: Compute integer-cent delta to apply to an account for a single transaction.
 * - Bank / Cash: debit subtracts (-amount), credit adds (+amount)
 * - Credit Card: debit increases owed (+amount), credit decreases owed (-amount)
 */
export function computeAccountDeltaCents(
  accountType: Account['type'],
  entryType: 'debit' | 'credit',
  amountCents: number
): number {
  const isCreditCard = accountType === 'credit';
  if (isCreditCard) {
    return entryType === 'debit' ? amountCents : -amountCents;
  }
  return entryType === 'debit' ? -amountCents : amountCents;
}

/**
 * Part C: Credit Card Debt Payoff Amortization Calculator (integer cents)
 */
export interface DebtPayoffResult {
  canPayOff: boolean;
  months: number;
  totalInterestCents: number;
  totalPaidCents: number;
  payoffDateLabel: string;
  minInterestCents: number;
}

export function calculateDebtPayoff(
  balanceCents: number,
  aprBps: number,
  monthlyPaymentCents: number
): DebtPayoffResult {
  if (balanceCents <= 0) {
    return {
      canPayOff: true,
      months: 0,
      totalInterestCents: 0,
      totalPaidCents: 0,
      payoffDateLabel: 'Paid off',
      minInterestCents: 0,
    };
  }

  const monthlyRate = aprBps / 10000 / 12;
  const firstMonthInterest = Math.round(balanceCents * monthlyRate);

  if (monthlyPaymentCents <= 0 || monthlyPaymentCents <= firstMonthInterest) {
    return {
      canPayOff: false,
      months: 0,
      totalInterestCents: 0,
      totalPaidCents: 0,
      payoffDateLabel: 'Payment too low',
      minInterestCents: firstMonthInterest,
    };
  }

  let remaining = balanceCents;
  let months = 0;
  let totalInterestCents = 0;
  let totalPaidCents = 0;
  const MAX_MONTHS = 600;

  while (remaining > 0 && months < MAX_MONTHS) {
    const interest = Math.round(remaining * monthlyRate);
    totalInterestCents += interest;
    remaining += interest;

    const payment = Math.min(remaining, monthlyPaymentCents);
    remaining -= payment;
    totalPaidCents += payment;
    months++;
  }

  const target = new Date();
  target.setMonth(target.getMonth() + months);
  const payoffDateLabel = target.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return {
    canPayOff: remaining === 0,
    months,
    totalInterestCents,
    totalPaidCents,
    payoffDateLabel: remaining === 0 ? payoffDateLabel : '50+ yrs',
    minInterestCents: firstMonthInterest,
  };
}

/**
 * Part D: Attribute an expense (including split transactions & category refunds) to categories.
 * - Debit adds to category spend
 * - Credit (refund) subtracts from the same category
 */
export function getCategoryNetSpendMap(
  expenses: Expense[],
  monthStr: string,
  displayCurrency: string,
  rates: Record<string, number>
): Map<string, number> {
  const map = new Map<string, number>();

  const toDisplay = (amountCents: number, currency: string): number => {
    if (!currency || currency === displayCurrency) return amountCents;
    const conv = convertCurrency(amountCents, currency, displayCurrency, rates);
    return conv ? conv.convertedAmount : 0;
  };

  for (const exp of expenses) {
    if (!exp.date.startsWith(monthStr)) continue;
    const sign = (exp.entryType || 'debit') === 'credit' ? -1 : 1;

    if (exp.splits && exp.splits.length > 0) {
      for (const s of exp.splits) {
        const delta = sign * toDisplay(s.amountCents, exp.currency);
        map.set(s.category, (map.get(s.category) || 0) + delta);
      }
    } else {
      const delta = sign * toDisplay(exp.amountCents, exp.currency);
      map.set(exp.category, (map.get(exp.category) || 0) + delta);
    }
  }

  // Clamp net category spend at 0 minimum so refunds never make a category negative
  map.forEach((val, key) => {
    if (val < 0) map.set(key, 0);
  });

  return map;
}

/**
 * Part D: Compute previous YYYY-MM string
 */
export function getPreviousMonth(monthStr: string): string {
  const [yStr, mStr] = monthStr.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) - 1;
  if (m < 1) {
    y -= 1;
    m = 12;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Part D: Budget Rollover + Transfers Summary per Category
 */
export interface BudgetStatusRow {
  category: string;
  baseLimitCents: number;
  rolloverCents: number;
  transferNetCents: number;
  availableCents: number;
  spentCents: number;
  remainingCents: number;
  overspentCents: number;
  pctUsed: number;
}

export function computeBudgetRolloverSummary(
  budgets: CategoryBudget[],
  expenses: Expense[],
  transfers: BudgetTransfer[],
  currentMonthStr: string,
  displayCurrency: string,
  rates: Record<string, number>
): BudgetStatusRow[] {
  const prevMonthStr = getPreviousMonth(currentMonthStr);
  const currentSpend = getCategoryNetSpendMap(expenses, currentMonthStr, displayCurrency, rates);
  const prevSpend = getCategoryNetSpendMap(expenses, prevMonthStr, displayCurrency, rates);

  // Only roll over if user has any previous-month activity OR previous-month budget existed
  const hasPrevExpenses = expenses.some((e) => e.date.startsWith(prevMonthStr));

  return budgets.map((b) => {
    const baseLimitCents = b.monthlyLimitCents;
    const prevSpentCents = prevSpend.get(b.category) || 0;
    const rolloverCents = hasPrevExpenses ? Math.max(0, baseLimitCents - prevSpentCents) : 0;

    let transferNetCents = 0;
    for (const t of transfers) {
      if (t.month !== currentMonthStr) continue;
      if (t.toCategory === b.category) transferNetCents += t.amountCents;
      if (t.fromCategory === b.category) transferNetCents -= t.amountCents;
    }

    const availableCents = Math.max(0, baseLimitCents + rolloverCents + transferNetCents);
    const spentCents = currentSpend.get(b.category) || 0;
    const remainingCents = availableCents - spentCents;
    const overspentCents = remainingCents < 0 ? Math.abs(remainingCents) : 0;
    const pctUsed = availableCents > 0 ? Math.round((spentCents / availableCents) * 100) : spentCents > 0 ? 100 : 0;

    return {
      category: b.category,
      baseLimitCents,
      rolloverCents,
      transferNetCents,
      availableCents,
      spentCents,
      remainingCents,
      overspentCents,
      pctUsed,
    };
  });
}

/**
 * Part D: Sinking Fund Pace Calculation
 * requiredMonthly = (target - current) / monthsLeft -> on-track / at-risk / funded
 */
export interface FundPace {
  monthsLeft: number;
  remainingCents: number;
  requiredMonthlyCents: number;
  currentPaceCents: number;
  status: 'funded' | 'on-track' | 'at-risk';
}

export function computeFundPace(
  fund: Fund,
  autoRules: FundAutoRule[],
  allocations: FundAllocation[],
  currentMonthStr: string
): FundPace {
  const remainingCents = Math.max(0, fund.targetAmountCents - fund.currentAmountCents);
  if (remainingCents === 0 && fund.targetAmountCents > 0) {
    return {
      monthsLeft: 0,
      remainingCents: 0,
      requiredMonthlyCents: 0,
      currentPaceCents: 0,
      status: 'funded',
    };
  }

  const today = new Date();
  const targetD = new Date(fund.targetDate + 'T00:00:00');
  const rawMonths =
    (targetD.getFullYear() - today.getFullYear()) * 12 +
    (targetD.getMonth() - today.getMonth());
  const monthsLeft = Math.max(1, isNaN(rawMonths) ? 1 : rawMonths);
  const requiredMonthlyCents = Math.ceil(remainingCents / monthsLeft);

  const activeRuleMonthly = autoRules
    .filter((r) => r.fundId === fund.id && r.active)
    .reduce((sum, r) => sum + r.amountCents, 0);

  const thisMonthDeposits = allocations
    .filter((a) => a.fundId === fund.id && a.type === 'deposit' && a.date.startsWith(currentMonthStr))
    .reduce((sum, a) => sum + a.amountCents, 0);

  const currentPaceCents = Math.max(activeRuleMonthly, thisMonthDeposits);
  const status: FundPace['status'] =
    currentPaceCents >= requiredMonthlyCents ? 'on-track' : 'at-risk';

  return {
    monthsLeft,
    remainingCents,
    requiredMonthlyCents,
    currentPaceCents,
    status,
  };
}

/**
 * Part D: 3-Month Day-by-Day Cash-Flow Forecast (Projection only, never auto-posts)
 */
export interface ForecastEvent {
  label: string;
  deltaCents: number;
  kind: 'income' | 'bill' | 'recurring' | 'fund' | 'whatif';
}

export interface ForecastDay {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number;
  monthStr: string; // YYYY-MM
  balanceCents: number;
  events: ForecastEvent[];
}

export function buildThreeMonthForecast({
  startingCashCents,
  monthlyIncomeCents,
  fixedBillsCents,
  bills,
  recurringExpenses,
  fundAutoRules,
  accounts,
  funds,
  displayCurrency,
  rates,
  whatIfExtraIncomeCents = 0,
  whatIfExtraExpenseCents = 0,
  whatIfOneTimeExpenseCents = 0,
}: {
  startingCashCents: number;
  monthlyIncomeCents: number;
  fixedBillsCents: number;
  bills: BillReminder[];
  recurringExpenses: RecurringExpense[];
  fundAutoRules: FundAutoRule[];
  accounts: Account[];
  funds: Fund[];
  displayCurrency: string;
  rates: Record<string, number>;
  whatIfExtraIncomeCents?: number;
  whatIfExtraExpenseCents?: number;
  whatIfOneTimeExpenseCents?: number;
}): ForecastDay[] {
  const toDisplay = (amountCents: number, currency: string): number => {
    if (!currency || currency === displayCurrency) return amountCents;
    const conv = convertCurrency(amountCents, currency, displayCurrency, rates);
    return conv ? conv.convertedAmount : 0;
  };

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days: ForecastDay[] = [];
  let runningBalance = startingCashCents;

  // Build 90 days forward
  for (let offset = 0; offset < 90; offset++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    const events: ForecastEvent[] = [];

    // One-time What-If expense on day 0 (today)
    if (offset === 0 && whatIfOneTimeExpenseCents > 0) {
      runningBalance -= whatIfOneTimeExpenseCents;
      events.push({
        label: 'What-If One-Time Expense',
        deltaCents: -whatIfOneTimeExpenseCents,
        kind: 'whatif',
      });
    }

    // Monthly Income on 1st of month (or today if offset===0 and day===1)
    if (day === 1) {
      const totalIncome = monthlyIncomeCents + whatIfExtraIncomeCents;
      if (totalIncome > 0) {
        runningBalance += totalIncome;
        events.push({
          label: whatIfExtraIncomeCents > 0 ? 'Monthly Income + What-If' : 'Monthly Income',
          deltaCents: totalIncome,
          kind: 'income',
        });
      }
      if (fixedBillsCents > 0 && bills.filter((b) => b.active).length === 0) {
        runningBalance -= fixedBillsCents;
        events.push({
          label: 'Fixed Monthly Bills',
          deltaCents: -fixedBillsCents,
          kind: 'bill',
        });
      }
      if (whatIfExtraExpenseCents > 0) {
        runningBalance -= whatIfExtraExpenseCents;
        events.push({
          label: 'What-If Monthly Expense',
          deltaCents: -whatIfExtraExpenseCents,
          kind: 'whatif',
        });
      }
    }

    // Active Bills
    for (const bill of bills) {
      if (!bill.active) continue;
      const effectiveDue = Math.min(bill.dueDay, lastDayOfMonth);
      if (effectiveDue === day) {
        const amt = toDisplay(bill.amountCents, bill.currency);
        if (amt > 0) {
          runningBalance -= amt;
          events.push({
            label: `Bill: ${bill.name}`,
            deltaCents: -amt,
            kind: 'bill',
          });
        }
      }
    }

    // Active Recurring Expenses (bank/cash accounts impact cash balance)
    for (const rec of recurringExpenses) {
      if (!rec.active) continue;
      const acc = accounts.find((a) => a.id === rec.accountId);
      if (acc && acc.type === 'credit') continue; // Credit card recurring doesn't reduce liquid cash directly
      const effectiveDay = Math.min(rec.dayOfMonth, lastDayOfMonth);
      if (effectiveDay === day) {
        const amt = toDisplay(rec.amountCents, rec.currency);
        if (amt > 0) {
          runningBalance -= amt;
          events.push({
            label: `Recurring: ${rec.name}`,
            deltaCents: -amt,
            kind: 'recurring',
          });
        }
      }
    }

    // Active Sinking Fund Auto-Rules
    for (const rule of fundAutoRules) {
      if (!rule.active) continue;
      const effectiveDay = Math.min(rule.dayOfMonth, lastDayOfMonth);
      if (effectiveDay === day) {
        const fund = funds.find((f) => f.id === rule.fundId);
        const amt = toDisplay(rule.amountCents, fund?.currency || displayCurrency);
        if (amt > 0) {
          runningBalance -= amt;
          events.push({
            label: `Fund: ${fund?.name || 'Sinking Fund'}`,
            deltaCents: -amt,
            kind: 'fund',
          });
        }
      }
    }

    days.push({
      dateStr,
      dayOfMonth: day,
      monthStr,
      balanceCents: runningBalance,
      events,
    });
  }

  return days;
}
