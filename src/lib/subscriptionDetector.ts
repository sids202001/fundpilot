// Subscription Detection & Financial Anomaly Engine
// Identifies recurring subscriptions, monthly burn, price increases, and anomalies

import { Expense, SubscriptionDetail, AnomalyAlert } from './types';

// Detect recurring monthly subscriptions
export function detectSubscriptions(expenses: Expense[]): Map<string, SubscriptionDetail> {
  const subscriptions = new Map<string, SubscriptionDetail>();
  if (expenses.length < 2) return subscriptions;

  // Group by normalized merchant
  const merchantGroups = new Map<string, Expense[]>();
  for (const exp of expenses) {
    const norm = exp.merchant.trim().toLowerCase();
    const list = merchantGroups.get(norm) || [];
    list.push(exp);
    merchantGroups.set(norm, list);
  }

  for (const [normMerchant, list] of merchantGroups.entries()) {
    if (list.length < 2) continue;

    // Sort by date ascending
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let isRecurring = false;
    let recurringCount = 0;
    let priceIncreaseCents = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const prevTime = new Date(prev.date).getTime();
      const currTime = new Date(curr.date).getTime();
      const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));

      // Monthly interval check: between 24 and 35 days, or roughly 1 month apart
      const isMonthlyInterval = diffDays >= 20 && diffDays <= 45;

      // Amount tolerance: ±5%
      const amountDiffRatio = Math.abs(curr.amountCents - prev.amountCents) / Math.max(1, prev.amountCents);
      const isSameAmount = amountDiffRatio <= 0.051;

      if (isMonthlyInterval && isSameAmount) {
        isRecurring = true;
        recurringCount++;
      }
    }

    if (isRecurring || recurringCount >= 1 || sorted.length >= 2) {
      const latest = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2];

      if (latest.amountCents > previous.amountCents) {
        priceIncreaseCents = latest.amountCents - previous.amountCents;
      }

      subscriptions.set(normMerchant, {
        merchant: latest.merchant,
        monthlyBurnCents: latest.amountCents,
        latestAmountCents: latest.amountCents,
        previousAmountCents: previous.amountCents,
        priceIncreaseCents,
        transactionCount: sorted.length,
        lastDate: latest.date,
      });
    }
  }

  return subscriptions;
}

// Detect anomalies across expenses
export function detectAnomalies(expenses: Expense[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  if (expenses.length === 0) return alerts;

  // Category statistics for outlier detection
  const categoryAmounts = new Map<string, number[]>();
  const merchantFirstSeen = new Map<string, string>();

  // Sort by date ascending to evaluate history in chronological order
  const chronological = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 0; i < chronological.length; i++) {
    const exp = chronological[i];
    const normMerchant = exp.merchant.toLowerCase().trim();

    // 1. Check for Duplicate Charge (same merchant + same amount within 24 hours)
    for (let j = 0; j < i; j++) {
      const past = chronological[j];
      if (
        past.merchant.toLowerCase().trim() === normMerchant &&
        past.amountCents === exp.amountCents &&
        past.id !== exp.id
      ) {
        const timeDiff = Math.abs(new Date(exp.date).getTime() - new Date(past.date).getTime());
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

    // 2. Amount far above normal range for category
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

    // 3. New Merchant first seen alert (flag only the latest few)
    if (!merchantFirstSeen.has(normMerchant)) {
      merchantFirstSeen.set(normMerchant, exp.date);
    }
  }

  return alerts;
}
