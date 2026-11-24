// FundPilot Core Data Types — Final Architecture
// All monetary values are strictly stored as integers in their currency's smallest unit.
// Floating point numbers are NEVER used for monetary storage.

export type TransactionSource = 'manual' | 'voice' | 'receipt' | 'csv';
export type AccountType = 'bank' | 'credit' | 'cash' | 'broker';
export type InvestmentType = 'Stocks' | '401(k)' | 'Mutual Funds' | 'ETFs' | 'Crypto' | 'Bonds' | 'Other';

export interface ExpenseItem {
  name: string;
  amountCents: number;
}

export interface ExpenseSplit {
  category: string;
  amountCents: number;
}

export interface Expense {
  id: string;
  amountCents: number; // Smallest integer unit in specified currency
  currency: string; // ISO 4217 code (USD, INR, EUR, JPY, BHD, etc.)
  merchant: string;
  category: string;
  date: string; // YYYY-MM-DD local date
  source: TransactionSource;
  accountId?: string; // Attached account ID
  entryType: 'debit' | 'credit'; // 'debit' = money out (spending), 'credit' = money in (inflow/refund)
  balanceApplied?: boolean; // True for new entries that auto-updated account balance; old entries remain untouched
  splits?: ExpenseSplit[]; // Optional category splits that sum to amountCents
  recurringId?: string; // Set if auto-posted from a RecurringExpense
  confidence: number; // 0.0 - 1.0
  notes?: string;
  isSubscription?: boolean;
  items?: ExpenseItem[];
  dedupKey?: string;
  createdAt: number;
  updatedAt: number;
  deviceId?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  category: string;
  dayOfMonth: number; // 1 - 31
  accountId?: string;
  active: boolean;
  lastPostedMonth?: string; // YYYY-MM
  createdAt: number;
  updatedAt: number;
  deviceId?: string;
}

export interface DebtPayoffPlan {
  id: string;
  accountId: string; // Credit card account ID
  aprBps: number; // Annual interest rate in basis points (e.g. 1999 = 19.99%)
  monthlyPaymentCents: number;
  active: boolean;
  updatedAt: number;
  deviceId?: string;
}

export interface BudgetTransfer {
  id: string;
  month: string; // YYYY-MM
  fromCategory: string;
  toCategory: string;
  amountCents: number;
  createdAt: number;
  updatedAt: number;
  deviceId?: string;
}

export interface NetWorthSnapshot {
  id: string; // nw-YYYY-MM
  month: string; // YYYY-MM
  netWorthCents: number;
  cashCents: number;
  fundsCents: number;
  investmentsCents: number;
  creditOwedCents: number;
  currency: string;
  updatedAt: number;
  deviceId?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balanceCents: number; // User-entered snapshot
  currency: string; // ISO 4217 code
  lastEditedDate: string; // YYYY-MM-DD local date
  updatedAt: number;
  deviceId?: string;
}

export interface InvestmentEntry {
  id: string;
  label?: string; // Optional short name, defaults to type name
  type: InvestmentType;
  amountCents: number; // Integer units
  currency: string; // ISO 4217 code
  lastUpdated: string; // Formatted date e.g. "Nov 15, 2026" or YYYY-MM-DD
  updatedAt: number;
  deviceId?: string;
}

export interface Fund {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string; // YYYY-MM-DD
  currency: string;
  createdAt: number;
  updatedAt: number;
  deviceId?: string;
}

export interface FundAllocation {
  id: string;
  fundId: string;
  sourceAccountId?: string; // ID of account debited/credited
  amountCents: number;
  type: 'deposit' | 'withdraw';
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
  updatedAt: number;
  deviceId?: string;
}

export interface FundAutoRule {
  id: string;
  fundId: string;
  sourceAccountId?: string;
  amountCents: number;
  dayOfMonth: number; // 1 - 31
  active: boolean;
  lastAppliedDate?: string; // YYYY-MM-DD
  lastSkippedNotice?: string; // Visible notice if rule skipped due to insufficient balance
  updatedAt: number;
  deviceId?: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deviceId?: string;
}

export interface CategoryRule {
  id: string;
  merchantPattern: string; // Lowercase pattern match
  category: string;
  updatedAt: number;
  deviceId?: string;
}

export interface CategoryBudget {
  category: string;
  monthlyLimitCents: number;
  currency?: string;
  updatedAt: number;
  deviceId?: string;
}

export interface BillReminder {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  dueDay: number; // 1 - 31
  active: boolean;
  paidMonths?: string[]; // e.g. ["2026-11"]
  updatedAt: number;
  deviceId?: string;
}

export interface FxRatesMap {
  base: string; // "USD"
  rates: Record<string, number>;
  asOfDate: string | null;
  timestamp: number;
}

export interface UserSettings {
  autoLockMinutes: number; // 1, 5, 15, 30
  displayCurrency: string; // ISO 4217 code (default USD)
  useReducedMotion: boolean;
  prefer2D: boolean;
  monthlyIncomeCents: number; // Money in settings
  fixedBillsCents: number; // Fixed monthly bills
  incomeCurrency?: string;
  fixedBillsCurrency?: string;
  // Legacy migration placeholders
  bankCashCents?: number;
  creditCardOwedCents?: number;
  updatedAt: number;
  deviceId?: string;
}

export interface EncryptedVaultMeta {
  salt: string; // Base64
  verifier: string; // Base64 ciphertext of verification phrase
  verifierIv: string; // Base64 IV
  recoveryWrappedKey?: string; // Base64 ciphertext of vault key encrypted with recovery key
  recoveryWrappedIv?: string; // Base64 IV
  updatedAt: number;
}

export interface VaultRecord {
  id: string;
  type:
    | 'expense'
    | 'account'
    | 'investment'
    | 'fund'
    | 'fund_allocation'
    | 'fund_rule'
    | 'bill'
    | 'custom_category'
    | 'category_rule'
    | 'budget'
    | 'recurring_expense'
    | 'debt_plan'
    | 'budget_transfer'
    | 'net_worth_snapshot'
    | 'settings';
  iv: string; // Base64 IV
  ciphertext: string; // Base64 ciphertext
  updatedAt: number;
}

export interface SyncTombstone {
  id: string;
  type: string;
  deletedAt: number;
}

export interface SyncReport {
  addedCount: number;
  updatedCount: number;
  tombstoneDeletedCount: number;
  skippedCount: number;
  conflicts: Array<{ id: string; type: string; winner: string; reason: string }>;
}

export interface SubscriptionDetail {
  merchant: string;
  monthlyBurnCents: number;
  latestAmountCents: number;
  previousAmountCents?: number;
  priceIncreaseCents?: number;
  transactionCount: number;
  lastDate: string;
}

export interface AnomalyAlert {
  id: string;
  type: 'duplicate' | 'new_merchant' | 'amount_anomaly';
  severity: 'warning' | 'info';
  title: string;
  message: string;
  expenseId: string;
  date: string;
}
