import { parseBankCSV } from '../src/lib/csvParsers';
import { detectSubscriptions } from '../src/lib/subscriptionDetector';
import { Expense } from '../src/lib/types';

// Fixture: 3 monthly charges from same merchant with 3rd charge rising ($15.49 -> $17.99)
const csvFixture = `Transaction Date,Post Date,Description,Category,Type,Amount
09/01/2026,09/01/2026,Netflix.com,Entertainment,Sale,-15.49
10/01/2026,10/01/2026,Netflix.com,Entertainment,Sale,-15.49
11/01/2026,11/01/2026,Netflix.com,Entertainment,Sale,-17.99`;

const parsed = parseBankCSV(csvFixture);
const expenses: Expense[] = parsed.expenses.map((e, idx) => ({
  ...e,
  id: `exp-${idx + 1}`,
  createdAt: Date.now() + idx,
}));

console.log('--- BANK CSV PARSED EXPENSES ---');
expenses.forEach((e) => {
  console.log(`Date: ${e.date} | Merchant: ${e.merchant.padEnd(12)} | Amount: $${(e.amountCents / 100).toFixed(2)} (${e.amountCents}¢)`);
});

const subscriptions = detectSubscriptions(expenses);
const sub = subscriptions.get('netflix.com');

console.log('\n--- SUBSCRIPTION DETECTION & PRICE-HIKE AUDIT ---');
if (sub) {
  console.log(`Merchant Name           : ${sub.merchant}`);
  console.log(`Transaction Count       : ${sub.transactionCount}`);
  console.log(`Previous Monthly Charge : $${((sub.previousAmountCents || 0) / 100).toFixed(2)} (${sub.previousAmountCents}¢)`);
  console.log(`Latest Monthly Charge   : $${(sub.latestAmountCents / 100).toFixed(2)} (${sub.latestAmountCents}¢)`);
  console.log(`Monthly Burn Total      : $${(sub.monthlyBurnCents / 100).toFixed(2)} / month`);
  console.log(`Price Increase Flagged  : ${sub.priceIncreaseCents && sub.priceIncreaseCents > 0 ? 'YES (FLAG ACTIVE)' : 'NO'}`);
  console.log(`Price Increase Delta    : +$${((sub.priceIncreaseCents || 0) / 100).toFixed(2)} (+${sub.priceIncreaseCents}¢)`);
} else {
  console.error('Subscription not detected!');
}
