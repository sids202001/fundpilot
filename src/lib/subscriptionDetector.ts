// Subscription Detection & Financial Anomaly Engine — Final Architecture
// Strict criteria:
// 1. Same merchant
// 2. At least 3 charges
// 3. At least 2 consecutive gaps of 24–35 days
// 4. Each consecutive pair within ±5% of amount (with price-hike support on qualifying consecutive charges)
// Catch-all flagging merchant on count alone is DELETED.

import { Expense, SubscriptionDetail, AnomalyAlert } from './types';

// Parse YYYY-MM-DD local date to milliseconds
function parseLocalDateMs(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return new Date(dateStr).getTime();
}

// Detect recurring monthly subscriptions strictly
export function detectSubscriptions(expenses: Expense[]): Map<string, SubscriptionDetail> {
  const subscriptions = new Map<string, SubscriptionDetail>();
  if (expenses.length < 3) return subscriptions;

  // Filter only debit expenses (credit money-in is never spending or subscriptions)
  const debits = expenses.filter((e) => e.entryType === 'debit' || !e.entryType);

  // Group by normalized merchant
  const merchantGroups = new Map<string, Expense[]>();
  for (const exp of debits) {
    const norm = exp.merchant.trim().toLowerCase();
    const list = merchantGroups.get(norm) || [];
    list.push(exp);
    merchantGroups.set(norm, list);
  }

  for (const [normMerchant, list] of merchantGroups.entries()) {
    // Condition 2: At least 3 charges required
    if (list.length < 3) continue;

    // Sort by local date ascending
    const sorted = [...list].sort((a, b) => parseLocalDateMs(a.date) - parseLocalDateMs(b.date));

    // Look for a qualifying subsequence of at least 3 charges meeting the 24-35 day gap condition
    let bestQualifying: Expense[] = [];

    // Sliding window check for consecutive recurring sequences
    for (let start = 0; start <= sorted.length - 3; start++) {
      const window: Expense[] = [sorted[start]];
      for (let i = start + 1; i < sorted.length; i++) {
        const prev = window[window.length - 1];
        const curr = sorted[i];

        const prevTime = parseLocalDateMs(prev.date);
        const currTime = parseLocalDateMs(curr.date);
        const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));

        // Condition 3: Consecutive gaps must be 24-35 days
        if (diffDays >= 24 && diffDays <= 35) {
          window.push(curr);
        } else if (diffDays > 35) {
          // Gap broken
          break;
        }
      }

      if (window.length >= 3 && window.length > bestQualifying.length) {
        bestQualifying = window;
      }
    }

    if (bestQualifying.length < 3) {
      continue; // Failed consecutive 24-35 day gap test
    }

    // Condition 4: Amount consistency ±5% or qualifying price hike
    // Check if consecutive pairs are consistent
    let isConsistent = true;
    let priceIncreaseCents = 0;
    const n = bestQualifying.length;

    // Prior charges (up to n-2) must be within ±5%
    for (let i = 1; i < n - 1; i++) {
      const prevAmt = bestQualifying[i - 1].amountCents;
      const currAmt = bestQualifying[i].amountCents;
      const ratio = Math.abs(currAmt - prevAmt) / Math.max(1, prevAmt);
      if (ratio > 0.05) {
        isConsistent = false;
        break;
      }
    }

    if (!isConsistent) continue;

    // Latest pair: either within ±5% OR a price increase (hike)
    const secondLastAmt = bestQualifying[n - 2].amountCents;
    const latestAmt = bestQualifying[n - 1].amountCents;
    const latestRatio = Math.abs(latestAmt - secondLastAmt) / Math.max(1, secondLastAmt);

    if (latestRatio <= 0.05) {
      // Steady recurring subscription
      priceIncreaseCents = 0;
    } else if (latestAmt > secondLastAmt) {
      // Qualifying price hike
      priceIncreaseCents = latestAmt - secondLastAmt;
    } else {
      // Price dropped by > 5% or erratic
      continue;
    }

    const latest = bestQualifying[n - 1];
    const previous = bestQualifying[n - 2];

    subscriptions.set(normMerchant, {
      merchant: latest.merchant,
      monthlyBurnCents: latestAmt, // Monthly burn = latest qualifying charge only
      latestAmountCents: latestAmt,
      previousAmountCents: previous.amountCents,
      priceIncreaseCents,
      transactionCount: bestQualifying.length,
      lastDate: latest.date,
    });
  }

  return subscriptions;
}

// Detect anomalies across expenses
export function detectAnomalies(expenses: Expense[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  if (expenses.length === 0) return alerts;

  const categoryAmounts = new Map<string, number[]>();
  const chronological = [...expenses].sort((a, b) => parseLocalDateMs(a.date) - parseLocalDateMs(b.date));

  for (let i = 0; i < chronological.length; i++) {
    const exp = chronological[i];
    const normMerchant = exp.merchant.toLowerCase().trim();

    // 1. Duplicate Charge Check
    for (let j = 0; j < i; j++) {
      const past = chronological[j];
      if (
        past.merchant.toLowerCase().trim() === normMerchant &&
        past.amountCents === exp.amountCents &&
        past.id !== exp.id
      ) {
        const timeDiff = Math.abs(parseLocalDateMs(exp.date) - parseLocalDateMs(past.date));
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        if (daysDiff <= 1.5) {
          alerts.push({
            id: `dup-${exp.id}`,
            type: 'duplicate',
            severity: 'warning',
            title: 'Possible Duplicate Charge',
            message: `Duplicate charge of $${(exp.amountCents / 100).toFixed(2)} at ${exp.merchant} within 24 hours.`,
            expenseId: exp.id,
            date: exp.date,
          });
          break;
        }
      }
    }

    // 2. Outlier Amount Check
    const catList = categoryAmounts.get(exp.category) || [];
    if (catList.length >= 3) {
      const avg = catList.reduce((acc, c) => acc + c, 0) / catList.length;
      if (exp.amountCents > avg * 2.5 && exp.amountCents > 10000) {
        alerts.push({
          id: `outlier-${exp.id}`,
          type: 'amount_anomaly',
          severity: 'warning',
          title: 'Unusually High Expense',
          message: `$${(exp.amountCents / 100).toFixed(2)} is >2.5x higher than your average ${exp.category} spend ($${(avg / 100).toFixed(2)}).`,
          expenseId: exp.id,
          date: exp.date,
        });
      }
    }

    catList.push(exp.amountCents);
    categoryAmounts.set(exp.category, catList);
  }

  return alerts;
}
