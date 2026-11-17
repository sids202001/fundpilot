'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Expense,
  Account,
  InvestmentEntry,
  Fund,
  FundAllocation,
  FundAutoRule,
  CustomCategory,
  CategoryRule,
  CategoryBudget,
  BillReminder,
  UserSettings,
  FxRatesMap,
  VaultRecord,
  SyncTombstone,
  SyncReport,
} from './types';
import {
  generateSalt,
  deriveKeyFromPin,
  createVaultVerifier,
  verifyPinAndDeriveKey,
  wrapVaultKeyWithRecoveryWords,
  unwrapVaultKeyWithRecoveryWords,
  encryptObject,
  decryptObject,
  bufferToBase64,
  getOrCreateDeviceId,
} from './crypto';
import { db, getVaultMeta, saveVaultMeta, wipeAllData } from './db';
import { detectSubscriptions } from './subscriptionDetector';
import { convertCurrency, formatMoney, getCurrencyDecimals } from './currencies';
import { validate12Words } from './bip39';

// Helper: Get local YYYY-MM-DD date string (Fix 15)
export function getLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Get local YYYY-MM string
export function getLocalMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Helper: Format local display date e.g. "Nov 15, 2026"
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dObj = new Date(y, m, d);
    if (!isNaN(dObj.getTime())) {
      return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return dateStr;
}

interface StoreContextType {
  // Vault & Security
  isVaultReady: boolean;
  isSetup: boolean;
  isLocked: boolean;
  setupPin: (pin: string, recoveryWords: string[]) => Promise<boolean>;
  unlockVault: (pin: string) => Promise<boolean>;
  recoverVaultWithKey: (recoveryWords: string[], newPin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string, newRecoveryWords: string[]) => Promise<boolean>;
  rotateRecoveryKey: (newRecoveryWords: string[]) => Promise<boolean>;
  lockVault: () => void;
  autoLockMinutes: number;

  // Data Collections
  expenses: Expense[];
  accounts: Account[];
  investments: InvestmentEntry[];
  funds: Fund[];
  fundAllocations: FundAllocation[];
  fundAutoRules: FundAutoRule[];
  customCategories: CustomCategory[];
  categoryRules: CategoryRule[];
  budgets: CategoryBudget[];
  bills: BillReminder[];
  settings: UserSettings;

  // FX & Offline
  fxRatesMap: FxRatesMap | null;
  rates: Record<string, number>;
  fxRate: { rate: number; asOfDate: string | null } | null;
  refreshFx: () => Promise<void>;
  isOffline: boolean;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCategoryRule: (merchantPattern: string, category: string) => Promise<void>;
  deleteCategoryRule: (id: string) => Promise<void>;
  setCategoryBudget: (category: string, monthlyLimitCents: number, currency?: string) => Promise<void>;
  deleteCategoryBudget: (category: string) => Promise<void>;

  // Account Actions
  addAccount: (name: string, type: Account['type'], balanceCents: number, currency: string) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Investment Actions (Fix 0: Manual Totals Only)
  addInvestment: (label: string, type: InvestmentEntry['type'], amountCents: number, currency: string) => Promise<void>;
  updateInvestment: (id: string, data: { label?: string; type?: InvestmentEntry['type']; amountCents?: number; currency?: string }) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;

  // Fund Actions (Fix 18: Transfers Move Money)
  createFund: (name: string, targetAmountCents: number, targetDate: string, currency: string) => Promise<void>;
  updateFund: (id: string, data: Partial<Fund>) => Promise<void>;
  deleteFund: (id: string) => Promise<void>;
  allocateFund: (fundId: string, amountCents: number, type: 'deposit' | 'withdraw', sourceAccountId?: string, note?: string) => Promise<{ success: boolean; error?: string }>;
  deleteFundAllocation: (id: string) => Promise<void>;
  createFundAutoRule: (fundId: string, amountCents: number, dayOfMonth: number, sourceAccountId?: string) => Promise<void>;
  toggleFundAutoRule: (id: string, active: boolean) => Promise<void>;
  deleteFundAutoRule: (id: string) => Promise<void>;

  // Custom Category Actions (Fix 20)
  addCustomCategory: (name: string) => Promise<void>;
  renameCustomCategory: (id: string, newName: string) => Promise<void>;
  deleteCustomCategory: (id: string) => Promise<{ reclassifiedCount: number }>;

  // Bill Actions (Fix 22)
  addBill: (name: string, amountCents: number, currency: string, dueDay: number) => Promise<void>;
  updateBill: (id: string, data: Partial<BillReminder>) => Promise<void>;
  toggleBillActive: (id: string, active: boolean) => Promise<void>;
  markBillPaid: (id: string, monthStr?: string) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;

  // Settings Actions
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Cross-Device Sync (Fix 25)
  exportSyncBundle: () => Promise<string>;
  importSyncBundle: (bundleJson: string) => Promise<{ success: boolean; report?: SyncReport; error?: string }>;

  // Backup & CSV
  exportEncryptedBackup: () => Promise<string>;
  importEncryptedBackup: (jsonContent: string) => Promise<boolean>;
  exportCSVData: () => { expensesCSV: string; fundsCSV: string; investmentsCSV: string; accountsCSV: string };
  wipeEverything: () => Promise<void>;

  // Financial Aggregates (Converted to displayCurrency)
  displayCurrency: string;
  totalNetWorthCents: number;
  totalBankCashCents: number;
  totalFundsCents: number;
  totalInvestmentsCents: number;
  totalCreditOwedCents: number;
  safeToSpendMonthCents: number;
  monthlyDebitSpentCents: number;
  monthlyCreditInflowCents: number;
  migratedHoldingsCount: number;

  // Honest Multi-Currency Status Markers (Item 4)
  unconvertedCurrencies: string[];
  netWorthUnconverted: string[];
  bankCashUnconverted: string[];
  fundsUnconverted: string[];
  investmentsUnconverted: string[];
  creditOwedUnconverted: string[];
  safeToSpendUnconverted: string[];
}

const DEFAULT_SETTINGS: UserSettings = {
  autoLockMinutes: 5,
  displayCurrency: 'USD',
  useReducedMotion: false,
  prefer2D: false,
  monthlyIncomeCents: 0,
  fixedBillsCents: 0,
  incomeCurrency: 'USD',
  fixedBillsCurrency: 'USD',
  bankCashCents: 0,
  creditCardOwedCents: 0,
  updatedAt: Date.now(),
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isVaultReady, setIsVaultReady] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // Collections state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<InvestmentEntry[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundAllocations, setFundAllocations] = useState<FundAllocation[]>([]);
  const [fundAutoRules, setFundAutoRules] = useState<FundAutoRule[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [bills, setBills] = useState<BillReminder[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // FX & Offline
  const [fxRatesMap, setFxRatesMap] = useState<FxRatesMap | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [migratedHoldingsCount, setMigratedHoldingsCount] = useState(0);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check vault status on mount
  useEffect(() => {
    async function initVaultCheck() {
      try {
        const meta = await getVaultMeta();
        if (meta && meta.salt && meta.verifier) {
          setIsSetup(true);
          setIsLocked(true);
        } else {
          setIsSetup(false);
          setIsLocked(true);
        }

        // Load cached FX rates from Dexie
        const cachedFx = await db.fxCache.get('USD');
        if (cachedFx) {
          setFxRatesMap(cachedFx);
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
      } finally {
        setIsVaultReady(true);
      }
    }
    initVaultCheck();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Idle timer for auto-lock
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isLocked && settings.autoLockMinutes > 0) {
      idleTimerRef.current = setTimeout(() => {
        lockVault();
      }, settings.autoLockMinutes * 60 * 1000);
    }
  }, [isLocked, settings.autoLockMinutes]);

  useEffect(() => {
    if (isLocked) return;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetIdleTimer();
    events.forEach((evt) => window.addEventListener(evt, handler));
    resetIdleTimer();
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isLocked, resetIdleTimer]);

  // Lock Vault
  const lockVault = useCallback(() => {
    setCryptoKey(null);
    setIsLocked(true);
    setExpenses([]);
    setAccounts([]);
    setInvestments([]);
    setFunds([]);
    setFundAllocations([]);
    setFundAutoRules([]);
    setCustomCategories([]);
    setCategoryRules([]);
    setBudgets([]);
    setBills([]);
  }, []);

  // Helper to persist encrypted record
  const persistRecord = async <T,>(type: VaultRecord['type'], id: string, data: T, key: CryptoKey) => {
    const { ciphertext, iv } = await encryptObject(data, key);
    await db.records.put({
      id,
      type,
      iv,
      ciphertext,
      updatedAt: (data as any)?.updatedAt || Date.now(),
    });
  };

  // Helper to delete encrypted record and save tombstone
  const deleteRecord = async (type: VaultRecord['type'], id: string) => {
    await db.records.delete(id);
    await db.tombstones.put({
      id,
      type,
      deletedAt: Date.now(),
    });
  };

  // Refresh FX from server proxy
  const refreshFx = async () => {
    try {
      const res = await fetch('/api/fx');
      if (res.ok) {
        const json: FxRatesMap = await res.json();
        if (json && json.rates) {
          setFxRatesMap(json);
          await db.fxCache.put(json);
        }
      }
    } catch (err) {
      // Offline fallback: load from Dexie cache
      const cached = await db.fxCache.get('USD');
      if (cached) setFxRatesMap(cached);
    }
  };

  // Setup Initial PIN with 12-word Recovery Key (Fix 26)
  const setupPin = async (pin: string, recoveryWords: string[]): Promise<boolean> => {
    try {
      const salt = generateSalt();
      const masterKey = await deriveKeyFromPin(pin, salt);
      const { verifier, verifierIv } = await createVaultVerifier(masterKey);

      // Wrap master key with 12 recovery words
      const { wrappedKey, wrappedIv } = await wrapVaultKeyWithRecoveryWords(masterKey, recoveryWords);

      await saveVaultMeta({
        salt,
        verifier,
        verifierIv,
        recoveryWrappedKey: wrappedKey,
        recoveryWrappedIv: wrappedIv,
        updatedAt: Date.now(),
      });

      // Default settings
      const initialSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        updatedAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
      };
      await persistRecord('settings', 'user_settings', initialSettings, masterKey);

      // Default Accounts (Fix 4: Bank and Credit snapshots)
      const primaryBank: Account = {
        id: 'acc-primary-bank',
        name: 'Primary Checking',
        type: 'bank',
        balanceCents: 0,
        currency: 'USD',
        lastEditedDate: getLocalDate(),
        updatedAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
      };
      const primaryCredit: Account = {
        id: 'acc-primary-credit',
        name: 'Primary Credit Card',
        type: 'credit',
        balanceCents: 0,
        currency: 'USD',
        lastEditedDate: getLocalDate(),
        updatedAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
      };
      await persistRecord('account', primaryBank.id, primaryBank, masterKey);
      await persistRecord('account', primaryCredit.id, primaryCredit, masterKey);

      // Default Category Budgets (Fix 19)
      const defaultBudgets: CategoryBudget[] = [
        { category: 'Groceries', monthlyLimitCents: 10000, updatedAt: Date.now(), deviceId: getOrCreateDeviceId() },
        { category: 'Food & Dining', monthlyLimitCents: 10000, updatedAt: Date.now(), deviceId: getOrCreateDeviceId() },
        { category: 'Shopping & Retail', monthlyLimitCents: 10000, updatedAt: Date.now(), deviceId: getOrCreateDeviceId() },
      ];
      for (const b of defaultBudgets) {
        await persistRecord('budget', b.category, b, masterKey);
      }

      setCryptoKey(masterKey);
      setSettings(initialSettings);
      setAccounts([primaryBank, primaryCredit]);
      setBudgets(defaultBudgets);
      setIsSetup(true);
      setIsLocked(false);

      refreshFx();
      return true;
    } catch (err) {
      console.error('Failed to setup PIN and vault:', err);
      return false;
    }
  };

  // True Catch-Up for Fund Auto-Rules (Fix 14)
  const runFundAutoRulesCatchup = async (
    currentFunds: Fund[],
    currentRules: FundAutoRule[],
    currentAccounts: Account[],
    key: CryptoKey
  ) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1; // 1 - 12

    let updatedFunds = [...currentFunds];
    let updatedRules = [...currentRules];
    let updatedAccounts = [...currentAccounts];
    let hasChanges = false;
    let missedMonthsTotal = 0;

    for (let rIdx = 0; rIdx < updatedRules.length; rIdx++) {
      const rule = updatedRules[rIdx];
      if (!rule.active) continue;

      const fund = updatedFunds.find((f) => f.id === rule.fundId);
      if (!fund) continue;

      // Determine starting month for catch-up
      let startYear: number;
      let startMonthNum: number;

      if (rule.lastAppliedDate) {
        const parts = rule.lastAppliedDate.split('-');
        startYear = parseInt(parts[0], 10);
        startMonthNum = parseInt(parts[1], 10) + 1;
        if (startMonthNum > 12) {
          startYear += 1;
          startMonthNum = 1;
        }
      } else {
        startYear = currentYear;
        startMonthNum = currentMonthNum;
      }

      // Collect all missed months up to current
      const missedMonths: Array<{ y: number; m: number }> = [];
      let iterY = startYear;
      let iterM = startMonthNum;

      while (iterY < currentYear || (iterY === currentYear && iterM < currentMonthNum)) {
        missedMonths.push({ y: iterY, m: iterM });
        iterM++;
        if (iterM > 12) {
          iterY++;
          iterM = 1;
        }
      }

      // Check current month if dueDay has passed or is today
      if (currentDay >= rule.dayOfMonth) {
        const alreadyAppliedCurrent =
          rule.lastAppliedDate && rule.lastAppliedDate.startsWith(getLocalMonth(today));
        if (!alreadyAppliedCurrent) {
          missedMonths.push({ y: currentYear, m: currentMonthNum });
        }
      }

      if (missedMonths.length === 0) continue;

      // Apply each missed month sequentially (Fix 14 & Fix 18)
      for (const { y, m } of missedMonths) {
        const monthStr = `${y}-${String(m).padStart(2, '0')}`;
        const dayStr = String(Math.min(rule.dayOfMonth, 28)).padStart(2, '0');
        const allocDate = `${monthStr}-${dayStr}`;

        // Transfer rule (Fix 18): Deduct from source account if available
        let sourceAcc = rule.sourceAccountId
          ? updatedAccounts.find((a) => a.id === rule.sourceAccountId)
          : updatedAccounts.find((a) => a.type === 'bank' || a.type === 'cash');

        if (sourceAcc && sourceAcc.balanceCents < rule.amountCents) {
          // Insufficient balance: SKIP allocation with visible record & notice (Fix 14)
          const skipNotice = `Skipped for ${monthStr}: Insufficient balance in ${sourceAcc.name} ($${(sourceAcc.balanceCents / 100).toFixed(2)} available, $${(rule.amountCents / 100).toFixed(2)} needed)`;
          rule.lastSkippedNotice = skipNotice;
          rule.updatedAt = Date.now();
          await persistRecord('fund_rule', rule.id, rule, key);
          hasChanges = true;
          console.warn(skipNotice);
          continue;
        }

        if (sourceAcc) {
          sourceAcc = {
            ...sourceAcc,
            balanceCents: sourceAcc.balanceCents - rule.amountCents,
            lastEditedDate: getLocalDate(),
            updatedAt: Date.now(),
          };
          updatedAccounts = updatedAccounts.map((a) => (a.id === sourceAcc!.id ? sourceAcc! : a));
          await persistRecord('account', sourceAcc.id, sourceAcc, key);
        }

        // Add to fund
        const fundIndex = updatedFunds.findIndex((f) => f.id === fund.id);
        if (fundIndex !== -1) {
          updatedFunds[fundIndex] = {
            ...updatedFunds[fundIndex],
            currentAmountCents: updatedFunds[fundIndex].currentAmountCents + rule.amountCents,
            updatedAt: Date.now(),
          };
          await persistRecord('fund', fund.id, updatedFunds[fundIndex], key);
        }

        // Record allocation
        const allocId = `auto-alloc-${Date.now()}-${rule.id}-${monthStr}`;
        const newAlloc: FundAllocation = {
          id: allocId,
          fundId: rule.fundId,
          sourceAccountId: sourceAcc?.id,
          amountCents: rule.amountCents,
          type: 'deposit',
          date: allocDate,
          note: `Auto-rule: Transfer for ${monthStr} on day ${rule.dayOfMonth}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deviceId: getOrCreateDeviceId(),
        };
        await persistRecord('fund_allocation', allocId, newAlloc, key);

        rule.lastAppliedDate = allocDate;
        rule.updatedAt = Date.now();
        await persistRecord('fund_rule', rule.id, rule, key);

        missedMonthsTotal++;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setFunds(updatedFunds);
      setFundAutoRules(updatedRules);
      setAccounts(updatedAccounts);
    }
  };

  // Unlock Vault with PIN
  const unlockVault = async (pin: string): Promise<boolean> => {
    try {
      const meta = await getVaultMeta();
      if (!meta) return false;

      const masterKey = await verifyPinAndDeriveKey(pin, meta.salt, meta.verifier, meta.verifierIv);
      if (!masterKey) return false;

      setCryptoKey(masterKey);

      // Decrypt all records
      const allRecords = await db.records.toArray();
      const loadedExpenses: Expense[] = [];
      const loadedAccounts: Account[] = [];
      const loadedInvestments: InvestmentEntry[] = [];
      const loadedFunds: Fund[] = [];
      const loadedAllocations: FundAllocation[] = [];
      const loadedAutoRules: FundAutoRule[] = [];
      const loadedCustomCats: CustomCategory[] = [];
      const loadedRules: CategoryRule[] = [];
      const loadedBudgets: CategoryBudget[] = [];
      const loadedBills: BillReminder[] = [];
      let loadedSettings = DEFAULT_SETTINGS;

      // Track legacy items to migrate
      const legacyHoldings: any[] = [];

      for (const rec of allRecords) {
        try {
          const decrypted = await decryptObject<any>(rec.ciphertext, rec.iv, masterKey);
          switch (rec.type) {
            case 'expense':
              loadedExpenses.push(decrypted);
              break;
            case 'account':
              loadedAccounts.push(decrypted);
              break;
            case 'investment':
              loadedInvestments.push(decrypted);
              break;
            case 'fund':
              loadedFunds.push(decrypted);
              break;
            case 'fund_allocation':
              loadedAllocations.push(decrypted);
              break;
            case 'fund_rule':
              loadedAutoRules.push(decrypted);
              break;
            case 'custom_category':
              loadedCustomCats.push(decrypted);
              break;
            case 'category_rule':
              loadedRules.push(decrypted);
              break;
            case 'budget':
              loadedBudgets.push(decrypted);
              break;
            case 'bill':
              loadedBills.push(decrypted);
              break;
            case 'settings':
              loadedSettings = decrypted;
              break;
            case 'holding' as any:
              legacyHoldings.push(decrypted);
              break;
          }
        } catch (decryptErr) {
          console.error(`Failed to decrypt record ${rec.id}:`, decryptErr);
        }
      }

      // ======================================================================
      // MIGRATION 1: Legacy Holdings -> New Investment Entries (Fix 0)
      // "every existing holding becomes one Investment entry: label = ticker,
      // type = Stocks (Crypto for SOL/BTC), amount = totalCostCents, lastUpdated = migration date.
      // Holding count before migration must equal entry count after — nothing silently dropped."
      // ======================================================================
      let migratedCount = 0;
      if (legacyHoldings.length > 0) {
        for (const h of legacyHoldings) {
          const ticker = (h.ticker || 'UNKNOWN').toUpperCase().trim();
          const isCrypto = ticker === 'SOL' || ticker === 'BTC';
          const invId = `inv-migrated-${h.id || Date.now()}`;
          const newEntry: InvestmentEntry = {
            id: invId,
            label: ticker,
            type: isCrypto ? 'Crypto' : 'Stocks',
            amountCents: h.totalCostCents || 0,
            currency: 'USD',
            lastUpdated: getLocalDate(),
            updatedAt: Date.now(),
            deviceId: getOrCreateDeviceId(),
          };
          loadedInvestments.push(newEntry);
          await persistRecord('investment', invId, newEntry, masterKey);
          await db.records.delete(h.id); // Remove legacy holding record
          migratedCount++;
        }
        setMigratedHoldingsCount(migratedCount);
      }

      // ======================================================================
      // MIGRATION 2: Legacy Settings Cash/Credit -> Real Accounts (Fix 4)
      // "the current single cash/credit settings numbers become one default Bank
      // account and one default Credit Card account with the same balances —
      // no user's numbers may change in migration."
      // ======================================================================
      if (loadedAccounts.length === 0) {
        const bankCash = loadedSettings.bankCashCents || 0;
        const creditOwed = loadedSettings.creditCardOwedCents || 0;

        const defaultBank: Account = {
          id: 'acc-primary-bank',
          name: 'Primary Checking',
          type: 'bank',
          balanceCents: bankCash,
          currency: 'USD',
          lastEditedDate: getLocalDate(),
          updatedAt: Date.now(),
          deviceId: getOrCreateDeviceId(),
        };
        const defaultCredit: Account = {
          id: 'acc-primary-credit',
          name: 'Primary Credit Card',
          type: 'credit',
          balanceCents: creditOwed,
          currency: 'USD',
          lastEditedDate: getLocalDate(),
          updatedAt: Date.now(),
          deviceId: getOrCreateDeviceId(),
        };

        loadedAccounts.push(defaultBank, defaultCredit);
        await persistRecord('account', defaultBank.id, defaultBank, masterKey);
        await persistRecord('account', defaultCredit.id, defaultCredit, masterKey);
      }

      // Mark recurring subscriptions (Strict Fix 2)
      const subs = detectSubscriptions(loadedExpenses);
      const enhancedExpenses = loadedExpenses.map((exp) => ({
        ...exp,
        isSubscription: subs.has(exp.merchant.toLowerCase().trim()),
      }));

      let activeBudgets = loadedBudgets;
      if (activeBudgets.length === 0) {
        activeBudgets = [
          { category: 'Groceries', monthlyLimitCents: 10000, updatedAt: Date.now(), deviceId: getOrCreateDeviceId() },
          { category: 'Food & Dining', monthlyLimitCents: 10000, updatedAt: Date.now(), deviceId: getOrCreateDeviceId() },
          { category: 'Shopping & Retail', monthlyLimitCents: 10000, updatedAt: Date.now(), deviceId: getOrCreateDeviceId() },
        ];
        for (const b of activeBudgets) {
          await persistRecord('budget', b.category, b, masterKey);
        }
      }

      setExpenses(enhancedExpenses);
      setAccounts(loadedAccounts);
      setInvestments(loadedInvestments);
      setFunds(loadedFunds);
      setFundAllocations(loadedAllocations);
      setFundAutoRules(loadedAutoRules);
      setCustomCategories(loadedCustomCats);
      setCategoryRules(loadedRules);
      setBudgets(activeBudgets);
      setBills(loadedBills);
      setSettings(loadedSettings);

      setIsLocked(false);

      // Run auto-rules true catch-up
      await runFundAutoRulesCatchup(loadedFunds, loadedAutoRules, loadedAccounts, masterKey);

      refreshFx();
      return true;
    } catch (err) {
      console.error('Error unlocking vault:', err);
      return false;
    }
  };

  // Recover Vault with 12-word Recovery Key (Fix 26)
  const recoverVaultWithKey = async (recoveryWords: string[], newPin: string): Promise<boolean> => {
    try {
      const meta = await getVaultMeta();
      if (!meta || !meta.recoveryWrappedKey || !meta.recoveryWrappedIv) return false;

      // Unwrap existing master CryptoKey
      const unwrappedKey = await unwrapVaultKeyWithRecoveryWords(
        meta.recoveryWrappedKey,
        meta.recoveryWrappedIv,
        recoveryWords
      );
      if (!unwrappedKey) return false;

      // Decrypt all existing records with unwrapped master key
      const records = await db.records.toArray();
      const decryptedRecords: Array<{ id: string; type: VaultRecord['type']; data: any }> = [];

      for (const rec of records) {
        const decrypted = await decryptObject<any>(rec.ciphertext, rec.iv, unwrappedKey);
        decryptedRecords.push({ id: rec.id, type: rec.type, data: decrypted });
      }

      // Derive new master CryptoKey from new PIN
      const newSalt = generateSalt();
      const newMasterKey = await deriveKeyFromPin(newPin, newSalt);
      const { verifier, verifierIv } = await createVaultVerifier(newMasterKey);

      // Re-wrap new master key with the same recovery words
      const { wrappedKey, wrappedIv } = await wrapVaultKeyWithRecoveryWords(newMasterKey, recoveryWords);

      // Save new vault meta
      await saveVaultMeta({
        salt: newSalt,
        verifier,
        verifierIv,
        recoveryWrappedKey: wrappedKey,
        recoveryWrappedIv: wrappedIv,
        updatedAt: Date.now(),
      });

      // Re-encrypt every record under the new master key
      for (const item of decryptedRecords) {
        await persistRecord(item.type, item.id, item.data, newMasterKey);
      }

      setCryptoKey(newMasterKey);
      setIsLocked(false);
      return true;
    } catch (err) {
      console.error('Recovery failed:', err);
      return false;
    }
  };

  // Change PIN flow with Mandatory New Recovery Key Issue (Item 1)
  const changePin = async (oldPin: string, newPin: string, newRecoveryWords: string[]): Promise<boolean> => {
    try {
      // Mandate valid 12-word recovery key to prevent leaving stale recovery wrap behind
      if (!newRecoveryWords || newRecoveryWords.length !== 12 || !validate12Words(newRecoveryWords)) {
        console.error('changePin rejected: newRecoveryWords must be a valid 12-word BIP-39 phrase');
        return false;
      }

      const meta = await getVaultMeta();
      if (!meta) return false;

      // 1. Verify old PIN first
      const oldKey = await verifyPinAndDeriveKey(oldPin, meta.salt, meta.verifier, meta.verifierIv);
      if (!oldKey) return false;

      // 2. Read and decrypt all existing records with oldKey
      const records = await db.records.toArray();
      const decryptedItems: Array<{ id: string; type: VaultRecord['type']; data: any }> = [];
      for (const rec of records) {
        const decrypted = await decryptObject<any>(rec.ciphertext, rec.iv, oldKey);
        decryptedItems.push({ id: rec.id, type: rec.type, data: decrypted });
      }

      // 3. Derive new master key
      const newSalt = generateSalt();
      const newKey = await deriveKeyFromPin(newPin, newSalt);
      const { verifier, verifierIv } = await createVaultVerifier(newKey);

      // 4. Wrap new master key with the NEW recovery key
      const { wrappedKey, wrappedIv } = await wrapVaultKeyWithRecoveryWords(newKey, newRecoveryWords);

      // 5. Atomic re-encryption of all records under newKey
      for (const item of decryptedItems) {
        await persistRecord(item.type, item.id, item.data, newKey);
      }

      // 6. Save updated vault meta with new salt, verifier, and NEW recovery wrap
      await saveVaultMeta({
        salt: newSalt,
        verifier,
        verifierIv,
        recoveryWrappedKey: wrappedKey,
        recoveryWrappedIv: wrappedIv,
        updatedAt: Date.now(),
      });

      setCryptoKey(newKey);
      return true;
    } catch (err) {
      console.error('Failed to change PIN:', err);
      return false;
    }
  };

  // Rotate Recovery Key (Fix 26)
  const rotateRecoveryKey = async (newRecoveryWords: string[]): Promise<boolean> => {
    if (!cryptoKey) return false;
    try {
      const meta = await getVaultMeta();
      if (!meta) return false;

      const { wrappedKey, wrappedIv } = await wrapVaultKeyWithRecoveryWords(cryptoKey, newRecoveryWords);
      await saveVaultMeta({
        ...meta,
        recoveryWrappedKey: wrappedKey,
        recoveryWrappedIv: wrappedIv,
        updatedAt: Date.now(),
      });
      return true;
    } catch (err) {
      console.error('Failed to rotate recovery key:', err);
      return false;
    }
  };

  // ==========================================================================
  // EXPENSE CRUD
  // ==========================================================================
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!cryptoKey) return;
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newExpense: Expense = {
      ...expenseData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    const updated = [newExpense, ...expenses];
    const subs = detectSubscriptions(updated);
    const enhanced = updated.map((exp) => ({
      ...exp,
      isSubscription: subs.has(exp.merchant.toLowerCase().trim()),
    }));

    setExpenses(enhanced);
    await persistRecord('expense', id, newExpense, cryptoKey);
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    if (!cryptoKey) return;
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const updatedExpense: Expense = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    const updatedList = expenses.map((e) => (e.id === id ? updatedExpense : e));
    const subs = detectSubscriptions(updatedList);
    const enhanced = updatedList.map((exp) => ({
      ...exp,
      isSubscription: subs.has(exp.merchant.toLowerCase().trim()),
    }));

    setExpenses(enhanced);
    await persistRecord('expense', id, updatedExpense, cryptoKey);
  };

  const deleteExpense = async (id: string) => {
    if (!cryptoKey) return;
    const updatedList = expenses.filter((e) => e.id !== id);
    const subs = detectSubscriptions(updatedList);
    const enhanced = updatedList.map((exp) => ({
      ...exp,
      isSubscription: subs.has(exp.merchant.toLowerCase().trim()),
    }));

    setExpenses(enhanced);
    await deleteRecord('expense', id);
  };

  // Category Rules
  const addCategoryRule = async (merchantPattern: string, category: string) => {
    if (!cryptoKey) return;
    const id = `rule-${Date.now()}`;
    const newRule: CategoryRule = {
      id,
      merchantPattern: merchantPattern.toLowerCase().trim(),
      category,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setCategoryRules((prev) => [...prev.filter((r) => r.merchantPattern !== newRule.merchantPattern), newRule]);
    await persistRecord('category_rule', id, newRule, cryptoKey);
  };

  const deleteCategoryRule = async (id: string) => {
    if (!cryptoKey) return;
    setCategoryRules((prev) => prev.filter((r) => r.id !== id));
    await deleteRecord('category_rule', id);
  };

  // Category Budgets
  const setCategoryBudget = async (category: string, monthlyLimitCents: number, currency: string = 'USD') => {
    if (!cryptoKey) return;
    const newBudget: CategoryBudget = {
      category,
      monthlyLimitCents,
      currency,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setBudgets((prev) => [...prev.filter((b) => b.category !== category), newBudget]);
    await persistRecord('budget', `budget-${category}`, newBudget, cryptoKey);
  };

  const deleteCategoryBudget = async (category: string) => {
    if (!cryptoKey) return;
    setBudgets((prev) => prev.filter((b) => b.category !== category));
    await deleteRecord('budget', `budget-${category}`);
  };

  // ==========================================================================
  // ACCOUNT CRUD (Fix 4)
  // ==========================================================================
  const addAccount = async (name: string, type: Account['type'], balanceCents: number, currency: string) => {
    if (!cryptoKey) return;
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAccount: Account = {
      id,
      name,
      type,
      balanceCents,
      currency,
      lastEditedDate: getLocalDate(),
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    await persistRecord('account', id, newAccount, cryptoKey);
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    if (!cryptoKey) return;
    const existing = accounts.find((a) => a.id === id);
    if (!existing) return;

    const updatedAccount: Account = {
      ...existing,
      ...data,
      lastEditedDate: data.balanceCents !== undefined ? getLocalDate() : existing.lastEditedDate,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    setAccounts((prev) => prev.map((a) => (a.id === id ? updatedAccount : a)));
    await persistRecord('account', id, updatedAccount, cryptoKey);
  };

  const deleteAccount = async (id: string) => {
    if (!cryptoKey) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await deleteRecord('account', id);
  };

  // ==========================================================================
  // INVESTMENTS CRUD (Fix 0: Manual Totals Only)
  // ==========================================================================
  const addInvestment = async (
    label: string,
    type: InvestmentEntry['type'],
    amountCents: number,
    currency: string
  ) => {
    if (!cryptoKey) return;
    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: InvestmentEntry = {
      id,
      label: label.trim() || type,
      type,
      amountCents,
      currency: currency || 'USD',
      lastUpdated: getLocalDate(),
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    setInvestments((prev) => [...prev, newEntry]);
    await persistRecord('investment', id, newEntry, cryptoKey);
  };

  const updateInvestment = async (
    id: string,
    data: { label?: string; type?: InvestmentEntry['type']; amountCents?: number; currency?: string }
  ) => {
    if (!cryptoKey) return;
    const existing = investments.find((i) => i.id === id);
    if (!existing) return;

    const updatedEntry: InvestmentEntry = {
      ...existing,
      label: data.label !== undefined ? (data.label.trim() || existing.type) : existing.label,
      type: data.type || existing.type,
      amountCents: data.amountCents !== undefined ? data.amountCents : existing.amountCents,
      currency: data.currency || existing.currency,
      lastUpdated: getLocalDate(), // Always update lastUpdated on edit
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    setInvestments((prev) => prev.map((i) => (i.id === id ? updatedEntry : i)));
    await persistRecord('investment', id, updatedEntry, cryptoKey);
  };

  const deleteInvestment = async (id: string) => {
    if (!cryptoKey) return;
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    await deleteRecord('investment', id);
  };

  // ==========================================================================
  // SINKING FUNDS & ATOMIC TRANSFERS (Fix 18)
  // ==========================================================================
  const createFund = async (name: string, targetAmountCents: number, targetDate: string, currency: string) => {
    if (!cryptoKey) return;
    const id = `fund-${Date.now()}`;
    const newFund: Fund = {
      id,
      name,
      targetAmountCents,
      currentAmountCents: 0,
      targetDate,
      currency: currency || 'USD',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setFunds((prev) => [...prev, newFund]);
    await persistRecord('fund', id, newFund, cryptoKey);
  };

  const updateFund = async (id: string, data: Partial<Fund>) => {
    if (!cryptoKey) return;
    const existing = funds.find((f) => f.id === id);
    if (!existing) return;

    const updatedFund: Fund = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setFunds((prev) => prev.map((f) => (f.id === id ? updatedFund : f)));
    await persistRecord('fund', id, updatedFund, cryptoKey);
  };

  const deleteFund = async (id: string) => {
    if (!cryptoKey) return;
    setFunds((prev) => prev.filter((f) => f.id !== id));
    await deleteRecord('fund', id);
  };

  // Allocate / Withdraw Fund with Transfer Rule (Fix 18)
  const allocateFund = async (
    fundId: string,
    amountCents: number,
    type: 'deposit' | 'withdraw',
    sourceAccountId?: string,
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!cryptoKey || amountCents <= 0) return { success: false, error: 'Invalid transfer amount' };

    const fund = funds.find((f) => f.id === fundId);
    if (!fund) return { success: false, error: 'Fund not found' };

    // Find source account
    const sourceAcc = sourceAccountId
      ? accounts.find((a) => a.id === sourceAccountId)
      : accounts.find((a) => a.type === 'bank' || a.type === 'cash');

    // Reject transfer if no source account exists (Item 2: Money cannot be created from nothing)
    if (!sourceAcc) {
      return { success: false, error: 'cannot transfer without a source account' };
    }

    // Reject withdraw that exceeds fund balance (Fix 1)
    if (type === 'withdraw' && amountCents > fund.currentAmountCents) {
      return { success: false, error: 'cannot withdraw more than the fund holds' };
    }

    // Reject deposit if source holds less than transfer amount (Fix 18)
    if (type === 'deposit' && amountCents > sourceAcc.balanceCents) {
      return { success: false, error: 'cannot allocate more than the source account balance holds' };
    }

    // Atomic Balance Adjustments
    const newFundBalance =
      type === 'deposit' ? fund.currentAmountCents + amountCents : fund.currentAmountCents - amountCents;

    const updatedFund: Fund = {
      ...fund,
      currentAmountCents: newFundBalance,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    let updatedSourceAcc: Account | undefined;
    if (sourceAcc) {
      const newAccBalance =
        type === 'deposit' ? sourceAcc.balanceCents - amountCents : sourceAcc.balanceCents + amountCents;

      updatedSourceAcc = {
        ...sourceAcc,
        balanceCents: newAccBalance,
        lastEditedDate: getLocalDate(),
        updatedAt: Date.now(),
        deviceId: getOrCreateDeviceId(),
      };
    }

    // Record allocation
    const allocId = `alloc-${Date.now()}`;
    const allocation: FundAllocation = {
      id: allocId,
      fundId,
      sourceAccountId: sourceAcc?.id,
      amountCents,
      type,
      date: getLocalDate(),
      note,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };

    setFunds((prev) => prev.map((f) => (f.id === fundId ? updatedFund : f)));
    if (updatedSourceAcc) {
      setAccounts((prev) => prev.map((a) => (a.id === updatedSourceAcc!.id ? updatedSourceAcc! : a)));
      await persistRecord('account', updatedSourceAcc.id, updatedSourceAcc, cryptoKey);
    }
    setFundAllocations((prev) => [allocation, ...prev]);

    await persistRecord('fund', fundId, updatedFund, cryptoKey);
    await persistRecord('fund_allocation', allocId, allocation, cryptoKey);

    return { success: true };
  };

  const deleteFundAllocation = async (id: string) => {
    if (!cryptoKey) return;
    const alloc = fundAllocations.find((a) => a.id === id);
    if (!alloc) return;

    // Reverse allocation effect on fund
    const fund = funds.find((f) => f.id === alloc.fundId);
    if (fund) {
      const reversedAmount =
        alloc.type === 'deposit'
          ? Math.max(0, fund.currentAmountCents - alloc.amountCents)
          : fund.currentAmountCents + alloc.amountCents;

      const updatedFund: Fund = { ...fund, currentAmountCents: reversedAmount, updatedAt: Date.now() };
      setFunds((prev) => prev.map((f) => (f.id === fund.id ? updatedFund : f)));
      await persistRecord('fund', fund.id, updatedFund, cryptoKey);
    }

    // Reverse effect on source account if recorded
    if (alloc.sourceAccountId) {
      const acc = accounts.find((a) => a.id === alloc.sourceAccountId);
      if (acc) {
        const reversedAccBalance =
          alloc.type === 'deposit' ? acc.balanceCents + alloc.amountCents : Math.max(0, acc.balanceCents - alloc.amountCents);
        const updatedAcc: Account = { ...acc, balanceCents: reversedAccBalance, updatedAt: Date.now() };
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? updatedAcc : a)));
        await persistRecord('account', acc.id, updatedAcc, cryptoKey);
      }
    }

    setFundAllocations((prev) => prev.filter((a) => a.id !== id));
    await deleteRecord('fund_allocation', id);
  };

  // Fund Auto-Rules
  const createFundAutoRule = async (
    fundId: string,
    amountCents: number,
    dayOfMonth: number,
    sourceAccountId?: string
  ) => {
    if (!cryptoKey) return;
    const ruleId = `frule-${Date.now()}`;
    const newRule: FundAutoRule = {
      id: ruleId,
      fundId,
      sourceAccountId,
      amountCents,
      dayOfMonth,
      active: true,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setFundAutoRules((prev) => [...prev, newRule]);
    await persistRecord('fund_rule', ruleId, newRule, cryptoKey);
  };

  const toggleFundAutoRule = async (id: string, active: boolean) => {
    if (!cryptoKey) return;
    const rule = fundAutoRules.find((r) => r.id === id);
    if (!rule) return;
    const updatedRule: FundAutoRule = { ...rule, active, updatedAt: Date.now() };
    setFundAutoRules((prev) => prev.map((r) => (r.id === id ? updatedRule : r)));
    await persistRecord('fund_rule', id, updatedRule, cryptoKey);
  };

  const deleteFundAutoRule = async (id: string) => {
    if (!cryptoKey) return;
    setFundAutoRules((prev) => prev.filter((r) => r.id !== id));
    await deleteRecord('fund_rule', id);
  };

  // ==========================================================================
  // CUSTOM CATEGORIES (Fix 20)
  // ==========================================================================
  const addCustomCategory = async (name: string) => {
    if (!cryptoKey || !name.trim()) return;
    const cleanName = name.trim();
    const id = `ccat-${Date.now()}`;
    const newCat: CustomCategory = {
      id,
      name: cleanName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setCustomCategories((prev) => [...prev, newCat]);
    await persistRecord('custom_category', id, newCat, cryptoKey);
  };

  const renameCustomCategory = async (id: string, newName: string) => {
    if (!cryptoKey || !newName.trim()) return;
    const existing = customCategories.find((c) => c.id === id);
    if (!existing) return;

    const oldName = existing.name;
    const updatedCat: CustomCategory = { ...existing, name: newName.trim(), updatedAt: Date.now() };

    // Reassign transactions with old category name to new name
    const updatedExpenses = expenses.map((e) =>
      e.category === oldName ? { ...e, category: newName.trim(), updatedAt: Date.now() } : e
    );
    for (const exp of updatedExpenses) {
      if (exp.category === newName.trim()) {
        await persistRecord('expense', exp.id, exp, cryptoKey);
      }
    }

    setExpenses(updatedExpenses);
    setCustomCategories((prev) => prev.map((c) => (c.id === id ? updatedCat : c)));
    await persistRecord('custom_category', id, updatedCat, cryptoKey);
  };

  const deleteCustomCategory = async (id: string): Promise<{ reclassifiedCount: number }> => {
    if (!cryptoKey) return { reclassifiedCount: 0 };
    const cat = customCategories.find((c) => c.id === id);
    if (!cat) return { reclassifiedCount: 0 };

    let reclassifiedCount = 0;
    const updatedExpenses = expenses.map((e) => {
      if (e.category === cat.name) {
        reclassifiedCount++;
        return { ...e, category: 'Miscellaneous', updatedAt: Date.now() };
      }
      return e;
    });

    for (const exp of updatedExpenses) {
      if (exp.category === 'Miscellaneous') {
        await persistRecord('expense', exp.id, exp, cryptoKey);
      }
    }

    setExpenses(updatedExpenses);
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteRecord('custom_category', id);
    return { reclassifiedCount };
  };

  // ==========================================================================
  // BILL REMINDERS (Fix 22)
  // ==========================================================================
  const addBill = async (name: string, amountCents: number, currency: string, dueDay: number) => {
    if (!cryptoKey) return;
    const id = `bill-${Date.now()}`;
    const newBill: BillReminder = {
      id,
      name,
      amountCents,
      currency: currency || 'USD',
      dueDay: Math.max(1, Math.min(31, dueDay)),
      active: true,
      paidMonths: [],
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setBills((prev) => [...prev, newBill]);
    await persistRecord('bill', id, newBill, cryptoKey);
  };

  const updateBill = async (id: string, data: Partial<BillReminder>) => {
    if (!cryptoKey) return;
    const existing = bills.find((b) => b.id === id);
    if (!existing) return;

    const updatedBill: BillReminder = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setBills((prev) => prev.map((b) => (b.id === id ? updatedBill : b)));
    await persistRecord('bill', id, updatedBill, cryptoKey);
  };

  const toggleBillActive = async (id: string, active: boolean) => {
    await updateBill(id, { active });
  };

  const markBillPaid = async (id: string, monthStr: string = getLocalMonth()) => {
    if (!cryptoKey) return;
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;

    const currentMonths = bill.paidMonths || [];
    const updatedPaidMonths = currentMonths.includes(monthStr)
      ? currentMonths.filter((m) => m !== monthStr)
      : [...currentMonths, monthStr];

    const updatedBill: BillReminder = {
      ...bill,
      paidMonths: updatedPaidMonths,
      updatedAt: Date.now(),
    };
    setBills((prev) => prev.map((b) => (b.id === id ? updatedBill : b)));
    await persistRecord('bill', id, updatedBill, cryptoKey);
  };

  const deleteBill = async (id: string) => {
    if (!cryptoKey) return;
    setBills((prev) => prev.filter((b) => b.id !== id));
    await deleteRecord('bill', id);
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!cryptoKey) return;
    const updated = {
      ...settings,
      ...newSettings,
      updatedAt: Date.now(),
      deviceId: getOrCreateDeviceId(),
    };
    setSettings(updated);
    await persistRecord('settings', 'user_settings', updated, cryptoKey);
  };

  // ==========================================================================
  // CROSS-DEVICE SYNC — FILE-BASED MERGE (Fix 25)
  // ==========================================================================
  const exportSyncBundle = async (): Promise<string> => {
    if (!cryptoKey) throw new Error('Vault is locked');
    const records = await db.records.toArray();
    const tombstones = await db.tombstones.toArray();

    const payload = {
      version: 1,
      appName: 'FundPilotSync',
      deviceId: getOrCreateDeviceId(),
      exportedAt: Date.now(),
      records,
      tombstones,
    };

    const { ciphertext, iv } = await encryptObject(payload, cryptoKey);
    const bundle = {
      version: 1,
      deviceId: getOrCreateDeviceId(),
      exportedAt: Date.now(),
      iv,
      ciphertext,
    };
    return JSON.stringify(bundle, null, 2);
  };

  const importSyncBundle = async (
    bundleJson: string
  ): Promise<{ success: boolean; report?: SyncReport; error?: string }> => {
    if (!cryptoKey) return { success: false, error: 'Vault is locked' };

    try {
      const parsed = JSON.parse(bundleJson);
      if (!parsed.ciphertext || !parsed.iv) {
        return { success: false, error: 'Invalid sync bundle format' };
      }

      // Decrypt using current vault key (both devices must share PIN)
      let payload: { records: VaultRecord[]; tombstones: SyncTombstone[]; deviceId: string };
      try {
        payload = await decryptObject<any>(parsed.ciphertext, parsed.iv, cryptoKey);
      } catch (decryptErr) {
        return {
          success: false,
          error: 'Wrong PIN or corrupted sync bundle. Decryption failed with local key.',
        };
      }

      const report: SyncReport = {
        addedCount: 0,
        updatedCount: 0,
        tombstoneDeletedCount: 0,
        skippedCount: 0,
        conflicts: [],
      };

      // 1. Process Remote Tombstones: Delete local records if remote deletion is newer
      for (const tomb of payload.tombstones || []) {
        const localRec = await db.records.get(tomb.id);
        if (localRec && localRec.updatedAt <= tomb.deletedAt) {
          await db.records.delete(tomb.id);
          report.tombstoneDeletedCount++;
        }
        await db.tombstones.put(tomb);
      }

      // 2. Process Remote Records with Last-Write-Wins
      for (const remoteRec of payload.records || []) {
        // Check if locally tombstoned
        const localTomb = await db.tombstones.get(remoteRec.id);
        if (localTomb && localTomb.deletedAt >= remoteRec.updatedAt) {
          report.skippedCount++;
          continue;
        }

        const localRec = await db.records.get(remoteRec.id);
        if (!localRec) {
          // New record
          await db.records.put(remoteRec);
          report.addedCount++;
        } else if (remoteRec.updatedAt > localRec.updatedAt) {
          // Remote is newer
          await db.records.put(remoteRec);
          report.updatedCount++;
          report.conflicts.push({
            id: remoteRec.id,
            type: remoteRec.type,
            winner: 'remote',
            reason: `Remote (${remoteRec.updatedAt}) was newer than local (${localRec.updatedAt})`,
          });
        } else if (remoteRec.updatedAt === localRec.updatedAt) {
          // Identical
          report.skippedCount++;
        } else {
          // Local is newer: preserve local
          report.skippedCount++;
          report.conflicts.push({
            id: localRec.id,
            type: localRec.type,
            winner: 'local',
            reason: `Local (${localRec.updatedAt}) was newer than remote (${remoteRec.updatedAt})`,
          });
        }
      }

      // Reload local vault collections from IndexedDB
      const allUpdated = await db.records.toArray();
      const reExpenses: Expense[] = [];
      const reAccounts: Account[] = [];
      const reInvestments: InvestmentEntry[] = [];
      const reFunds: Fund[] = [];
      const reAllocations: FundAllocation[] = [];
      const reAutoRules: FundAutoRule[] = [];
      const reCustomCats: CustomCategory[] = [];
      const reRules: CategoryRule[] = [];
      const reBudgets: CategoryBudget[] = [];
      const reBills: BillReminder[] = [];
      let reSettings = settings;

      for (const rec of allUpdated) {
        try {
          const decrypted = await decryptObject<any>(rec.ciphertext, rec.iv, cryptoKey);
          switch (rec.type) {
            case 'expense':
              reExpenses.push(decrypted);
              break;
            case 'account':
              reAccounts.push(decrypted);
              break;
            case 'investment':
              reInvestments.push(decrypted);
              break;
            case 'fund':
              reFunds.push(decrypted);
              break;
            case 'fund_allocation':
              reAllocations.push(decrypted);
              break;
            case 'fund_rule':
              reAutoRules.push(decrypted);
              break;
            case 'custom_category':
              reCustomCats.push(decrypted);
              break;
            case 'category_rule':
              reRules.push(decrypted);
              break;
            case 'budget':
              reBudgets.push(decrypted);
              break;
            case 'bill':
              reBills.push(decrypted);
              break;
            case 'settings':
              reSettings = decrypted;
              break;
          }
        } catch (e) {
          // ignore decrypt errors for obsolete items
        }
      }

      setExpenses(reExpenses);
      setAccounts(reAccounts);
      setInvestments(reInvestments);
      setFunds(reFunds);
      setFundAllocations(reAllocations);
      setFundAutoRules(reAutoRules);
      setCustomCategories(reCustomCats);
      setCategoryRules(reRules);
      setBudgets(reBudgets);
      setBills(reBills);
      setSettings(reSettings);

      return { success: true, report };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Sync import failed' };
    }
  };

  // Encrypted Backup Export / Import
  const exportEncryptedBackup = async (): Promise<string> => {
    const meta = await getVaultMeta();
    const records = await db.records.toArray();
    const backupObj = {
      version: 2,
      appName: 'FundPilot',
      exportedAt: new Date().toISOString(),
      meta,
      records,
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const importEncryptedBackup = async (jsonContent: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.meta || !data.records || !Array.isArray(data.records)) {
        return false;
      }

      await wipeAllData();
      await saveVaultMeta(data.meta);
      for (const rec of data.records) {
        await db.records.put(rec);
      }

      setIsSetup(true);
      lockVault();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  };

  // Multi-Currency CSV Export
  const exportCSVData = () => {
    // Expenses CSV
    const expHeaders = ['ID,Date,Merchant,Category,Amount,Currency,Type,Source,Confidence,Is_Subscription,Notes'];
    const expRows = expenses.map((e) => {
      const decimals = getCurrencyDecimals(e.currency);
      const amtStr = (e.amountCents / Math.pow(10, decimals)).toFixed(decimals);
      return `"${e.id}","${e.date}","${e.merchant.replace(/"/g, '""')}","${e.category}",${amtStr},"${e.currency}","${e.entryType}","${e.source}",${(e.confidence * 100).toFixed(0)}%,${e.isSubscription ? 'Yes' : 'No'},"${(e.notes || '').replace(/"/g, '""')}"`;
    });
    const expensesCSV = [expHeaders, ...expRows].join('\n');

    // Funds CSV
    const fundHeaders = ['ID,Name,Target_Amount,Current_Amount,Target_Date,Currency'];
    const fundRows = funds.map((f) => {
      const decimals = getCurrencyDecimals(f.currency);
      const targetStr = (f.targetAmountCents / Math.pow(10, decimals)).toFixed(decimals);
      const currStr = (f.currentAmountCents / Math.pow(10, decimals)).toFixed(decimals);
      return `"${f.id}","${f.name.replace(/"/g, '""')}",${targetStr},${currStr},"${f.targetDate}","${f.currency}"`;
    });
    const fundsCSV = [fundHeaders, ...fundRows].join('\n');

    // Investments CSV (Manual Totals Only)
    const invHeaders = ['ID,Label,Type,Amount,Currency,Last_Updated'];
    const invRows = investments.map((i) => {
      const decimals = getCurrencyDecimals(i.currency);
      const amtStr = (i.amountCents / Math.pow(10, decimals)).toFixed(decimals);
      return `"${i.id}","${(i.label || i.type).replace(/"/g, '""')}","${i.type}",${amtStr},"${i.currency}","${i.lastUpdated}"`;
    });
    const investmentsCSV = [invHeaders, ...invRows].join('\n');

    // Accounts CSV
    const accHeaders = ['ID,Name,Type,Balance,Currency,Last_Edited'];
    const accRows = accounts.map((a) => {
      const decimals = getCurrencyDecimals(a.currency);
      const balStr = (a.balanceCents / Math.pow(10, decimals)).toFixed(decimals);
      return `"${a.id}","${a.name.replace(/"/g, '""')}","${a.type}",${balStr},"${a.currency}","${a.lastEditedDate}"`;
    });
    const accountsCSV = [accHeaders, ...accRows].join('\n');

    return { expensesCSV, fundsCSV, investmentsCSV, accountsCSV };
  };

  const wipeEverything = async () => {
    await wipeAllData();
    lockVault();
    setIsSetup(false);
    setSettings(DEFAULT_SETTINGS);
  };

  // ==========================================================================
  // FINANCIAL CALCULATIONS & NET WORTH RECONCILIATION (Multi-Currency Fix 24)
  // All totals converted into displayCurrency using real FX rates
  // ==========================================================================
  const displayCurrency = settings.displayCurrency || 'USD';
  const rates = fxRatesMap?.rates || {};

  // 1. Bank Cash & Broker liquid accounts (Item 4: Never silently mix unconverted amounts)
  const { totalBankCashCents, bankCashUnconverted } = useMemo(() => {
    let sum = 0;
    const unconverted: string[] = [];
    for (const a of accounts.filter((acc) => acc.type === 'bank' || acc.type === 'cash' || acc.type === 'broker')) {
      if (a.currency === displayCurrency) {
        sum += a.balanceCents;
      } else {
        const conv = convertCurrency(a.balanceCents, a.currency, displayCurrency, rates);
        if (conv) {
          sum += conv.convertedAmount;
        } else {
          if (!unconverted.includes(a.currency)) unconverted.push(a.currency);
        }
      }
    }
    return { totalBankCashCents: sum, bankCashUnconverted: unconverted };
  }, [accounts, displayCurrency, rates]);

  // 2. Sinking Funds Total
  const { totalFundsCents, fundsUnconverted } = useMemo(() => {
    let sum = 0;
    const unconverted: string[] = [];
    for (const f of funds) {
      if (f.currency === displayCurrency) {
        sum += f.currentAmountCents;
      } else {
        const conv = convertCurrency(f.currentAmountCents, f.currency, displayCurrency, rates);
        if (conv) {
          sum += conv.convertedAmount;
        } else {
          if (!unconverted.includes(f.currency)) unconverted.push(f.currency);
        }
      }
    }
    return { totalFundsCents: sum, fundsUnconverted: unconverted };
  }, [funds, displayCurrency, rates]);

  // 3. Investments Total (Sum of manual entry totals ONLY)
  const { totalInvestmentsCents, investmentsUnconverted } = useMemo(() => {
    let sum = 0;
    const unconverted: string[] = [];
    for (const inv of investments) {
      if (inv.currency === displayCurrency) {
        sum += inv.amountCents;
      } else {
        const conv = convertCurrency(inv.amountCents, inv.currency, displayCurrency, rates);
        if (conv) {
          sum += conv.convertedAmount;
        } else {
          if (!unconverted.includes(inv.currency)) unconverted.push(inv.currency);
        }
      }
    }
    return { totalInvestmentsCents: sum, investmentsUnconverted: unconverted };
  }, [investments, displayCurrency, rates]);

  // 4. Credit Card Liabilities Total
  const { totalCreditOwedCents, creditOwedUnconverted } = useMemo(() => {
    let sum = 0;
    const unconverted: string[] = [];
    for (const a of accounts.filter((acc) => acc.type === 'credit')) {
      if (a.currency === displayCurrency) {
        sum += a.balanceCents;
      } else {
        const conv = convertCurrency(a.balanceCents, a.currency, displayCurrency, rates);
        if (conv) {
          sum += conv.convertedAmount;
        } else {
          if (!unconverted.includes(a.currency)) unconverted.push(a.currency);
        }
      }
    }
    return { totalCreditOwedCents: sum, creditOwedUnconverted: unconverted };
  }, [accounts, displayCurrency, rates]);

  // Net Worth 4-Part Sum & Unconverted Status
  const netWorthUnconverted = useMemo(() => {
    return Array.from(
      new Set([
        ...bankCashUnconverted,
        ...fundsUnconverted,
        ...investmentsUnconverted,
        ...creditOwedUnconverted,
      ])
    );
  }, [bankCashUnconverted, fundsUnconverted, investmentsUnconverted, creditOwedUnconverted]);

  const totalNetWorthCents = totalBankCashCents + totalFundsCents + totalInvestmentsCents - totalCreditOwedCents;

  // Monthly Spending & Inflow Math (Fix 13: Money-in is NEVER spending)
  const currentMonth = getLocalMonth();

  // Debit expenses only count toward spent
  const { monthlyDebitSpentCents, debitSpentUnconverted } = useMemo(() => {
    let sum = 0;
    const unconverted: string[] = [];
    for (const e of expenses.filter((exp) => exp.date.startsWith(currentMonth) && (exp.entryType === 'debit' || !exp.entryType))) {
      if (e.currency === displayCurrency) {
        sum += e.amountCents;
      } else {
        const conv = convertCurrency(e.amountCents, e.currency, displayCurrency, rates);
        if (conv) {
          sum += conv.convertedAmount;
        } else {
          if (!unconverted.includes(e.currency)) unconverted.push(e.currency);
        }
      }
    }
    return { monthlyDebitSpentCents: sum, debitSpentUnconverted: unconverted };
  }, [expenses, currentMonth, displayCurrency, rates]);

  // Credit expenses count toward inflows (cash flow only, never spent)
  const monthlyCreditInflowCents = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonth) && e.entryType === 'credit')
      .reduce((sum, e) => {
        const conv = convertCurrency(e.amountCents, e.currency, displayCurrency, rates);
        return sum + (conv ? conv.convertedAmount : e.amountCents);
      }, 0);
  }, [expenses, currentMonth, displayCurrency, rates]);

  // Fund deposits this month
  const { fundDepositsThisMonthCents, fundDepositsUnconverted } = useMemo(() => {
    let sum = 0;
    const unconverted: string[] = [];
    for (const a of fundAllocations.filter((alloc) => alloc.date.startsWith(currentMonth) && alloc.type === 'deposit')) {
      const fund = funds.find((f) => f.id === a.fundId);
      const cur = fund ? fund.currency : 'USD';
      if (cur === displayCurrency) {
        sum += a.amountCents;
      } else {
        const conv = convertCurrency(a.amountCents, cur, displayCurrency, rates);
        if (conv) {
          sum += conv.convertedAmount;
        } else {
          if (!unconverted.includes(cur)) unconverted.push(cur);
        }
      }
    }
    return { fundDepositsThisMonthCents: sum, fundDepositsUnconverted: unconverted };
  }, [fundAllocations, funds, currentMonth, displayCurrency, rates]);

  // Safe to Spend = Monthly Income − Fixed Bills − Fund Deposits − Debit Spent
  const { incomeConverted, incomeUnconverted } = useMemo(() => {
    const cur = settings.incomeCurrency || 'USD';
    if (cur === displayCurrency) {
      return { incomeConverted: settings.monthlyIncomeCents, incomeUnconverted: false };
    }
    const conv = convertCurrency(settings.monthlyIncomeCents, cur, displayCurrency, rates);
    if (conv) {
      return { incomeConverted: conv.convertedAmount, incomeUnconverted: false };
    }
    return { incomeConverted: 0, incomeUnconverted: true };
  }, [settings.monthlyIncomeCents, settings.incomeCurrency, displayCurrency, rates]);

  const { fixedBillsConverted, fixedBillsUnconverted } = useMemo(() => {
    const cur = settings.fixedBillsCurrency || 'USD';
    if (cur === displayCurrency) {
      return { fixedBillsConverted: settings.fixedBillsCents, fixedBillsUnconverted: false };
    }
    const conv = convertCurrency(settings.fixedBillsCents, cur, displayCurrency, rates);
    if (conv) {
      return { fixedBillsConverted: conv.convertedAmount, fixedBillsUnconverted: false };
    }
    return { fixedBillsConverted: 0, fixedBillsUnconverted: true };
  }, [settings.fixedBillsCents, settings.fixedBillsCurrency, displayCurrency, rates]);

  const safeToSpendUnconverted = useMemo(() => {
    const list: string[] = [...debitSpentUnconverted, ...fundDepositsUnconverted];
    if (incomeUnconverted && settings.incomeCurrency && !list.includes(settings.incomeCurrency)) {
      list.push(settings.incomeCurrency);
    }
    if (fixedBillsUnconverted && settings.fixedBillsCurrency && !list.includes(settings.fixedBillsCurrency)) {
      list.push(settings.fixedBillsCurrency);
    }
    return list;
  }, [debitSpentUnconverted, fundDepositsUnconverted, incomeUnconverted, fixedBillsUnconverted, settings.incomeCurrency, settings.fixedBillsCurrency]);

  const safeToSpendMonthCents = Math.max(
    0,
    incomeConverted - fixedBillsConverted - fundDepositsThisMonthCents - monthlyDebitSpentCents
  );

  const unconvertedCurrencies = useMemo(() => {
    return Array.from(new Set([...netWorthUnconverted, ...safeToSpendUnconverted]));
  }, [netWorthUnconverted, safeToSpendUnconverted]);

  const fxRate = useMemo(() => {
    if (!fxRatesMap || !fxRatesMap.rates['INR']) return null;
    return { rate: fxRatesMap.rates['INR'], asOfDate: fxRatesMap.asOfDate };
  }, [fxRatesMap]);

  return (
    <StoreContext.Provider
      value={{
        isVaultReady,
        isSetup,
        isLocked,
        setupPin,
        unlockVault,
        recoverVaultWithKey,
        changePin,
        rotateRecoveryKey,
        lockVault,
        autoLockMinutes: settings.autoLockMinutes,
        expenses,
        accounts,
        investments,
        funds,
        fundAllocations,
        fundAutoRules,
        customCategories,
        categoryRules,
        budgets,
        bills,
        settings,
        fxRatesMap,
        rates,
        fxRate,
        refreshFx,
        isOffline,
        addExpense,
        updateExpense,
        deleteExpense,
        addCategoryRule,
        deleteCategoryRule,
        setCategoryBudget,
        deleteCategoryBudget,
        addAccount,
        updateAccount,
        deleteAccount,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        createFund,
        updateFund,
        deleteFund,
        allocateFund,
        deleteFundAllocation,
        createFundAutoRule,
        toggleFundAutoRule,
        deleteFundAutoRule,
        addCustomCategory,
        renameCustomCategory,
        deleteCustomCategory,
        addBill,
        updateBill,
        toggleBillActive,
        markBillPaid,
        deleteBill,
        updateSettings,
        exportSyncBundle,
        importSyncBundle,
        exportEncryptedBackup,
        importEncryptedBackup,
        exportCSVData,
        wipeEverything,
        displayCurrency,
        totalNetWorthCents,
        totalBankCashCents,
        totalFundsCents,
        totalInvestmentsCents,
        totalCreditOwedCents,
        safeToSpendMonthCents,
        monthlyDebitSpentCents,
        monthlyCreditInflowCents,
        migratedHoldingsCount,
        unconvertedCurrencies,
        netWorthUnconverted,
        bankCashUnconverted,
        fundsUnconverted,
        investmentsUnconverted,
        creditOwedUnconverted,
        safeToSpendUnconverted,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
