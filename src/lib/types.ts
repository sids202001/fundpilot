// FundPilot Core Data Types
// All monetary values are strictly stored as integer cents (1 USD = 100 cents, 1 INR = 100 paise)
// Floating point numbers are NEVER used for monetary values.

export type TransactionSource = 'manual' | 'voice' | 'receipt' | 'csv';
export type AccountBucket = 'bank' | 'credit' | 'cash';

export interface Expense {
  id: string;
  amountCents: number; // Integer cents
  merchant: string;
  category: string;
  date: string; // YYYY-MM-DD
  source: TransactionSource;
  accountType?: AccountBucket; // 'bank' | 'credit' | 'cash'
  entryType?: 'debit' | 'credit'; // 'debit' = money out, 'credit' = money in
  confidence: number; // 0.0 - 1.0 (e.g. 0.95 = 95%)
  notes?: string;
  isSubscription?: boolean;
  createdAt: number;
}

export interface CategoryRule {
  id: string;
  merchantPattern: string; // Lowercase pattern match
  category: string;
  updatedAt: number;
}

export interface CategoryBudget {
  category: string;
  monthlyLimitCents: number;
}

export interface Fund {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string; // YYYY-MM-DD
  currency: 'USD' | 'INR';
  createdAt: number;
}

export interface FundAllocation {
  id: string;
  fundId: string;
  amountCents: number;
  type: 'deposit' | 'withdraw';
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface FundAutoRule {
  id: string;
  fundId: string;
  amountCents: number;
  dayOfMonth: number; // 1 - 31
  active: boolean;
  lastAppliedDate?: string; // YYYY-MM-DD
}

export interface TaxLot {
  id: string;
  date: string;
  shares: number;
  costPerShareCents: number;
  totalCostCents: number;
}

export type AssetType = 'equity' | 'crypto';

export interface Holding {
  id: string;
  ticker: string;
  assetType: AssetType;
  shares: number;
  totalCostCents: number;
  taxLots: TaxLot[];
  realizedPnlCents?: number;
  dividendsReceivedCents?: number;
  notes?: string;
  updatedAt: number;
}

export interface CorporateAction {
  id: string;
  ticker: string;
  type: 'split' | 'dividend';
  splitRatio?: number; // e.g. 8 for 8-for-1
  dividendCentsPerShare?: number;
  date: string; // YYYY-MM-DD
  appliedAt: number;
  notes?: string;
}

export interface QuoteData {
  ticker: string;
  price: number; // Current spot price in USD
  changePercent?: number;
  timestamp: number;
  source: string;
  isStale?: boolean;
}

export interface FxRateData {
  pair: string; // "USD/INR"
  rate: number; // e.g. 84.25
  asOfDate: string;
  timestamp: number;
}

export interface UserSettings {
  bankCashCents: number;
  creditCardOwedCents: number; // Credit card balance owed (liability subtracted from net worth)
  monthlyIncomeCents: number; // Money in
  fixedBillsCents: number; // Money out
  portfolioTargetValueCents?: number;
  portfolioTargetDate?: string;
  autoLockMinutes: number;
  useReducedMotion: boolean;
  prefer2D: boolean;
  biometricsEnabled: boolean;
  cloudLlmOptIn: boolean;
  cloudLlmKey?: string;
}

export interface EncryptedVaultMeta {
  salt: string; // Base64
  verifier: string; // Base64 ciphertext of verification phrase
  verifierIv: string; // Base64 IV
  biometricCredentialId?: string;
  biometricWrappedKey?: string;
  updatedAt: number;
}

export interface VaultRecord {
  id: string;
  type: 'expense' | 'fund' | 'fund_allocation' | 'fund_rule' | 'holding' | 'corporate_action' | 'category_rule' | 'budget' | 'settings';
  iv: string; // Base64 IV
  ciphertext: string; // Base64 ciphertext
  updatedAt: number;
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
