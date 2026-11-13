'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Expense,
  CategoryRule,
  CategoryBudget,
  Fund,
  FundAllocation,
  FundAutoRule,
  Holding,
  TaxLot,
  CorporateAction,
  UserSettings,
  QuoteData,
  FxRateData,
  VaultRecord,
} from './types';
import {
  generateSalt,
  deriveKeyFromPin,
  createVaultVerifier,
  verifyPinAndDeriveKey,
  encryptObject,
  decryptObject,
} from './crypto';
import { db, getVaultMeta, saveVaultMeta, wipeAllData } from './db';
import { detectSubscriptions } from './subscriptionDetector';

interface StoreContextType {
  // Vault & Security
  isVaultReady: boolean;
  isSetup: boolean;
  isLocked: boolean;
  setupPin: (pin: string) => Promise<boolean>;
  unlockVault: (pin: string) => Promise<boolean>;
  lockVault: () => void;
  autoLockMinutes: number;

  // Data collections
  expenses: Expense[];
  categoryRules: CategoryRule[];
  budgets: CategoryBudget[];
  funds: Fund[];
  fundAllocations: FundAllocation[];
  fundAutoRules: FundAutoRule[];
  holdings: Holding[];
  corporateActions: CorporateAction[];
  settings: UserSettings;

  // Quotes & FX
  quotes: Record<string, QuoteData>;
  fxRate: FxRateData | null;
  refreshQuotes: (force?: boolean) => Promise<void>;
  isOffline: boolean;

  // Actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  addCategoryRule: (merchantPattern: string, category: string) => Promise<void>;
  setCategoryBudget: (category: string, monthlyLimitCents: number) => Promise<void>;
  
  createFund: (name: string, targetAmountCents: number, targetDate: string, currency: 'USD' | 'INR') => Promise<void>;
  allocateFund: (fundId: string, amountCents: number, type: 'deposit' | 'withdraw', note?: string) => Promise<void>;
  createFundAutoRule: (fundId: string, amountCents: number, dayOfMonth: number) => Promise<void>;

  addHolding: (holding: { ticker: string; assetType: 'equity' | 'crypto'; shares: number; costPerShareCents: number; date?: string; notes?: string }) => Promise<void>;
  applyCorporateSplit: (ticker: string, splitRatio: number) => Promise<void>;
  recordDividend: (ticker: string, totalAmountCents: number, date: string) => Promise<void>;

  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Backup & Restore
  exportEncryptedBackup: () => Promise<string>;
  importEncryptedBackup: (jsonContent: string) => Promise<boolean>;
  exportCSVData: () => { expensesCSV: string; fundsCSV: string; holdingsCSV: string };
  wipeEverything: () => Promise<void>;

  // Financial aggregates
  totalNetWorthCents: number;
  totalFundsCents: number;
  totalPortfolioCents: number;
  creditCardOwedCents: number;
  safeToSpendMonthCents: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  bankCashCents: 0,
  creditCardOwedCents: 0,
  monthlyIncomeCents: 0,
  fixedBillsCents: 0,
  autoLockMinutes: 5,
  useReducedMotion: false,
  prefer2D: false,
  biometricsEnabled: false,
  cloudLlmOptIn: false,
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isVaultReady, setIsVaultReady] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // Financial data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundAllocations, setFundAllocations] = useState<FundAllocation[]>([]);
  const [fundAutoRules, setFundAutoRules] = useState<FundAutoRule[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Quotes and FX
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [fxRate, setFxRate] = useState<FxRateData | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const lastQuotesFetchRef = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize vault check
  useEffect(() => {
    async function checkVault() {
      try {
        const meta = await getVaultMeta();
        if (meta && meta.salt && meta.verifier) {
          setIsSetup(true);
          setIsLocked(true);
        } else {
          setIsSetup(false);
          setIsLocked(true);
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
      } finally {
        setIsVaultReady(true);
      }
    }
    checkVault();

    // Online / Offline listeners
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

  // Lock vault
  const lockVault = useCallback(() => {
    setCryptoKey(null);
    setIsLocked(true);
    // Clear sensitive state from memory
    setExpenses([]);
    setFunds([]);
    setFundAllocations([]);
    setHoldings([]);
    setCorporateActions([]);
    setBudgets([]);
  }, []);

  // Encrypted persistence helper
  const persistRecord = async <T,>(type: VaultRecord['type'], id: string, data: T, key: CryptoKey) => {
    const { ciphertext, iv } = await encryptObject(data, key);
    await db.records.put({
      id,
      type,
      iv,
      ciphertext,
      updatedAt: Date.now(),
    });
  };

  // Setup initial master PIN
  const setupPin = async (pin: string): Promise<boolean> => {
    try {
      const salt = generateSalt();
      const key = await deriveKeyFromPin(pin, salt);
      const { verifier, verifierIv } = await createVaultVerifier(key);

      await saveVaultMeta({
        salt,
        verifier,
        verifierIv,
        updatedAt: Date.now(),
      });

      // Persist default settings
      const { ciphertext, iv } = await encryptObject(DEFAULT_SETTINGS, key);
      await db.records.put({
        id: 'user_settings',
        type: 'settings',
        iv,
        ciphertext,
        updatedAt: Date.now(),
      });

      setCryptoKey(key);
      setIsSetup(true);
      setIsLocked(false);
      setSettings(DEFAULT_SETTINGS);
      return true;
    } catch (err) {
      console.error('Error setting up PIN:', err);
      return false;
    }
  };

  // Run sinking fund auto-rules catch-up
  const runFundAutoRulesCatchup = async (currentFunds: Fund[], currentRules: FundAutoRule[], key: CryptoKey) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let updatedFunds = [...currentFunds];
    let updatedRules = [...currentRules];
    let hasChanges = false;

    for (let i = 0; i < updatedRules.length; i++) {
      const rule = updatedRules[i];
      if (!rule.active) continue;

      const lastMonthApplied = rule.lastAppliedDate ? rule.lastAppliedDate.substring(0, 7) : '';
      if (currentDay >= rule.dayOfMonth && lastMonthApplied !== currentMonthKey) {
        // Apply auto-transfer
        const fundIdx = updatedFunds.findIndex((f) => f.id === rule.fundId);
        if (fundIdx !== -1) {
          const allocId = `auto-alloc-${Date.now()}-${rule.id}`;
          const newAlloc: FundAllocation = {
            id: allocId,
            fundId: rule.fundId,
            amountCents: rule.amountCents,
            type: 'deposit',
            date: today.toISOString().split('T')[0],
            note: `Auto-rule: Monthly transfer on day ${rule.dayOfMonth}`,
            createdAt: Date.now(),
          };

          updatedFunds[fundIdx] = {
            ...updatedFunds[fundIdx],
            currentAmountCents: updatedFunds[fundIdx].currentAmountCents + rule.amountCents,
          };

          updatedRules[i] = {
            ...rule,
            lastAppliedDate: today.toISOString().split('T')[0],
          };

          await persistRecord('fund_allocation', allocId, newAlloc, key);
          await persistRecord('fund', updatedFunds[fundIdx].id, updatedFunds[fundIdx], key);
          await persistRecord('fund_rule', rule.id, updatedRules[i], key);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setFunds(updatedFunds);
      setFundAutoRules(updatedRules);
    }
  };

  // Unlock vault with PIN
  const unlockVault = async (pin: string): Promise<boolean> => {
    try {
      const meta = await getVaultMeta();
      if (!meta) return false;

      const key = await verifyPinAndDeriveKey(pin, meta.salt, meta.verifier, meta.verifierIv);
      if (!key) {
        return false;
      }

      setCryptoKey(key);

      // Decrypt all records from IndexedDB
      const allRecords = await db.records.toArray();
      const loadedExpenses: Expense[] = [];
      const loadedRules: CategoryRule[] = [];
      const loadedBudgets: CategoryBudget[] = [];
      const loadedFunds: Fund[] = [];
      const loadedAllocations: FundAllocation[] = [];
      const loadedAutoRules: FundAutoRule[] = [];
      const loadedHoldings: Holding[] = [];
      const loadedCorpActions: CorporateAction[] = [];
      let loadedSettings = DEFAULT_SETTINGS;

      for (const rec of allRecords) {
        try {
          const decrypted = await decryptObject<any>(rec.ciphertext, rec.iv, key);
          switch (rec.type) {
            case 'expense':
              loadedExpenses.push(decrypted);
              break;
            case 'category_rule':
              loadedRules.push(decrypted);
              break;
            case 'budget':
              loadedBudgets.push(decrypted);
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
            case 'holding':
              loadedHoldings.push(decrypted);
              break;
            case 'corporate_action':
              loadedCorpActions.push(decrypted);
              break;
            case 'settings':
              loadedSettings = decrypted;
              break;
          }
        } catch (decryptErr) {
          console.error(`Failed to decrypt record ${rec.id}:`, decryptErr);
        }
      }

      // Mark recurring subscriptions
      const subs = detectSubscriptions(loadedExpenses);
      const enhancedExpenses = loadedExpenses.map((exp) => ({
        ...exp,
        isSubscription: subs.has(exp.merchant.toLowerCase().trim()),
      }));

      setExpenses(enhancedExpenses);
      setCategoryRules(loadedRules);
      setBudgets(loadedBudgets);
      setFunds(loadedFunds);
      setFundAllocations(loadedAllocations);
      setFundAutoRules(loadedAutoRules);
      setHoldings(loadedHoldings);
      setCorporateActions(loadedCorpActions);
      setSettings(loadedSettings);

      setIsLocked(false);

      // Run auto-rules catchup on launch
      await runFundAutoRulesCatchup(loadedFunds, loadedAutoRules, key);

      // Refresh quotes and FX
      setTimeout(() => {
        refreshQuotes();
        refreshFx();
      }, 100);

      return true;
    } catch (err) {
      console.error('Error unlocking vault:', err);
      return false;
    }
  };

  // Quotes fetcher
  const refreshQuotes = async (force: boolean = false) => {
    const now = Date.now();
    // At most once every 15 minutes unless forced
    if (!force && now - lastQuotesFetchRef.current < 15 * 60 * 1000 && Object.keys(quotes).length > 0) {
      return;
    }

    // Identify tickers from holdings or default portfolio
    const tickerSet = new Set<string>();
    holdings.forEach((h) => tickerSet.add(h.ticker.toUpperCase()));
    ['NVDA', 'MSFT', 'AMD', 'SNDK', 'MU', 'AVGO', 'GOOGL', 'ORCL', 'QCOM', 'CRM', 'NOW', 'NFLX', 'META', 'INTC', 'TEM', 'SOFI', 'XYZ', 'SOL', 'BTC'].forEach((t) => tickerSet.add(t));

    const tickerList = Array.from(tickerSet).join(',');
    try {
      const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickerList)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.quotes) {
          setQuotes(json.quotes);
          lastQuotesFetchRef.current = now;

          // Cache to Dexie for offline use
          for (const [sym, q] of Object.entries(json.quotes as Record<string, QuoteData>)) {
            await db.quotesCache.put(q);
          }
          return;
        }
      }
    } catch (err) {
      // Offline fallback: load from cached quotes
      const cached = await db.quotesCache.toArray();
      if (cached.length > 0) {
        const map: Record<string, QuoteData> = {};
        cached.forEach((q) => {
          map[q.ticker] = { ...q, isStale: true };
        });
        setQuotes(map);
      }
    }
  };

  // FX fetcher
  const refreshFx = async () => {
    try {
      const res = await fetch('/api/fx?pair=USD/INR');
      if (res.ok) {
        const json = await res.json();
        setFxRate(json);
        await db.fxCache.put(json);
      }
    } catch (err) {
      const cached = await db.fxCache.get('USD/INR');
      if (cached) setFxRate(cached);
    }
  };

  // Add Expense
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!cryptoKey) return;
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newExpense: Expense = {
      ...expenseData,
      id,
      createdAt: Date.now(),
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

  // Add Global Category Rule
  const addCategoryRule = async (merchantPattern: string, category: string) => {
    if (!cryptoKey) return;
    const id = `rule-${Date.now()}`;
    const newRule: CategoryRule = {
      id,
      merchantPattern: merchantPattern.toLowerCase().trim(),
      category,
      updatedAt: Date.now(),
    };

    setCategoryRules((prev) => [...prev.filter((r) => r.merchantPattern !== newRule.merchantPattern), newRule]);
    await persistRecord('category_rule', id, newRule, cryptoKey);
  };

  // Set Category Budget
  const setCategoryBudget = async (category: string, monthlyLimitCents: number) => {
    if (!cryptoKey) return;
    const newBudget: CategoryBudget = { category, monthlyLimitCents };
    setBudgets((prev) => [...prev.filter((b) => b.category !== category), newBudget]);
    await persistRecord('budget', `budget-${category}`, newBudget, cryptoKey);
  };

  // Create Fund
  const createFund = async (name: string, targetAmountCents: number, targetDate: string, currency: 'USD' | 'INR') => {
    if (!cryptoKey) return;
    const id = `fund-${Date.now()}`;
    const newFund: Fund = {
      id,
      name,
      targetAmountCents,
      currentAmountCents: 0,
      targetDate,
      currency,
      createdAt: Date.now(),
    };

    setFunds((prev) => [...prev, newFund]);
    await persistRecord('fund', id, newFund, cryptoKey);
  };

  // Allocate / Withdraw Fund
  const allocateFund = async (fundId: string, amountCents: number, type: 'deposit' | 'withdraw', note?: string) => {
    if (!cryptoKey) return;
    const allocId = `alloc-${Date.now()}`;
    const allocation: FundAllocation = {
      id: allocId,
      fundId,
      amountCents,
      type,
      date: new Date().toISOString().split('T')[0],
      note,
      createdAt: Date.now(),
    };

    const fund = funds.find((f) => f.id === fundId);
    if (!fund) return;

    const delta = type === 'deposit' ? amountCents : -amountCents;
    const updatedFund: Fund = {
      ...fund,
      currentAmountCents: Math.max(0, fund.currentAmountCents + delta),
    };

    setFunds((prev) => prev.map((f) => (f.id === fundId ? updatedFund : f)));
    setFundAllocations((prev) => [allocation, ...prev]);

    await persistRecord('fund', fundId, updatedFund, cryptoKey);
    await persistRecord('fund_allocation', allocId, allocation, cryptoKey);
  };

  // Create Fund Auto-Rule
  const createFundAutoRule = async (fundId: string, amountCents: number, dayOfMonth: number) => {
    if (!cryptoKey) return;
    const ruleId = `frule-${Date.now()}`;
    const newRule: FundAutoRule = {
      id: ruleId,
      fundId,
      amountCents,
      dayOfMonth,
      active: true,
    };

    setFundAutoRules((prev) => [...prev, newRule]);
    await persistRecord('fund_rule', ruleId, newRule, cryptoKey);
  };

  // Add Holding
  const addHolding = async (data: {
    ticker: string;
    assetType: 'equity' | 'crypto';
    shares: number;
    costPerShareCents: number;
    date?: string;
    notes?: string;
  }) => {
    if (!cryptoKey) return;
    const cleanTicker = data.ticker.toUpperCase().replace('-USD', '').trim();
    const existing = holdings.find((h) => h.ticker === cleanTicker);

    const lotTotal = Math.round(data.shares * data.costPerShareCents);
    const newLot: TaxLot = {
      id: `lot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: data.date || new Date().toISOString().split('T')[0],
      shares: data.shares,
      costPerShareCents: data.costPerShareCents,
      totalCostCents: lotTotal,
    };

    let updatedHolding: Holding;
    if (existing) {
      const totalShares = existing.shares + data.shares;
      const totalCostCents = existing.totalCostCents + lotTotal;
      updatedHolding = {
        ...existing,
        shares: totalShares,
        totalCostCents,
        taxLots: [...existing.taxLots, newLot],
        updatedAt: Date.now(),
      };
      setHoldings((prev) => prev.map((h) => (h.id === existing.id ? updatedHolding : h)));
    } else {
      updatedHolding = {
        id: `hold-${Date.now()}`,
        ticker: cleanTicker,
        assetType: data.assetType,
        shares: data.shares,
        totalCostCents: lotTotal,
        taxLots: [newLot],
        notes: data.notes,
        updatedAt: Date.now(),
      };
      setHoldings((prev) => [...prev, updatedHolding]);
    }

    await persistRecord('holding', updatedHolding.id, updatedHolding, cryptoKey);
    refreshQuotes(true);
  };

  // Corporate Actions: Stock Splits (HARD REQUIREMENT - XYZ Split Test)
  // XYZ split test: 1 share bought at $1,150.89 pre-split.
  // Apply 8-for-1 split. Result must be exactly 8 shares at $143.86 cost basis, total cost still $1,150.89.
  const applyCorporateSplit = async (ticker: string, splitRatio: number) => {
    if (!cryptoKey || splitRatio <= 0) return;
    const cleanTicker = ticker.toUpperCase().trim();
    const holding = holdings.find((h) => h.ticker === cleanTicker);
    if (!holding) return;

    const newTotalShares = holding.shares * splitRatio;
    // Total cost basis remains UNCHANGED to the exact cent
    const totalCostCents = holding.totalCostCents;

    // Adjust tax lots
    const updatedLots: TaxLot[] = holding.taxLots.map((lot) => {
      const newShares = lot.shares * splitRatio;
      // Integer cents cost per share: Math.round(lot.totalCostCents / newShares)
      const newCostPerShareCents = Math.round(lot.totalCostCents / newShares);
      return {
        ...lot,
        shares: newShares,
        costPerShareCents: newCostPerShareCents,
        totalCostCents: lot.totalCostCents, // Total cost remains unchanged
      };
    });

    const updatedHolding: Holding = {
      ...holding,
      shares: newTotalShares,
      totalCostCents,
      taxLots: updatedLots,
      updatedAt: Date.now(),
    };

    const actionId = `split-${Date.now()}`;
    const action: CorporateAction = {
      id: actionId,
      ticker: cleanTicker,
      type: 'split',
      splitRatio,
      date: new Date().toISOString().split('T')[0],
      appliedAt: Date.now(),
      notes: `${splitRatio}-for-1 stock split applied. Share count increased to ${newTotalShares}, total cost basis invariant ($${(totalCostCents / 100).toFixed(2)}).`,
    };

    setHoldings((prev) => prev.map((h) => (h.id === holding.id ? updatedHolding : h)));
    setCorporateActions((prev) => [action, ...prev]);

    await persistRecord('holding', updatedHolding.id, updatedHolding, cryptoKey);
    await persistRecord('corporate_action', actionId, action, cryptoKey);
  };

  // Record Dividend as income, not price gain
  const recordDividend = async (ticker: string, totalAmountCents: number, date: string) => {
    if (!cryptoKey) return;
    const cleanTicker = ticker.toUpperCase().trim();
    const holding = holdings.find((h) => h.ticker === cleanTicker);

    const actionId = `div-${Date.now()}`;
    const action: CorporateAction = {
      id: actionId,
      ticker: cleanTicker,
      type: 'dividend',
      dividendCentsPerShare: holding && holding.shares > 0 ? Math.round(totalAmountCents / holding.shares) : totalAmountCents,
      date,
      appliedAt: Date.now(),
      notes: `Dividend payment of $${(totalAmountCents / 100).toFixed(2)} recorded as income.`,
    };

    if (holding) {
      const updatedHolding = {
        ...holding,
        dividendsReceivedCents: (holding.dividendsReceivedCents || 0) + totalAmountCents,
        updatedAt: Date.now(),
      };
      setHoldings((prev) => prev.map((h) => (h.id === holding.id ? updatedHolding : h)));
      await persistRecord('holding', holding.id, updatedHolding, cryptoKey);
    }

    setCorporateActions((prev) => [action, ...prev]);
    await persistRecord('corporate_action', actionId, action, cryptoKey);
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!cryptoKey) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await persistRecord('settings', 'user_settings', updated, cryptoKey);
  };

  // Backup & Restore
  const exportEncryptedBackup = async (): Promise<string> => {
    const meta = await getVaultMeta();
    const records = await db.records.toArray();
    const backupObj = {
      version: 1,
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

  const exportCSVData = () => {
    // Expenses CSV
    const expHeaders = ['ID,Date,Merchant,Category,Amount_USD,Source,Confidence,Is_Subscription,Notes'];
    const expRows = expenses.map((e) =>
      `"${e.id}","${e.date}","${e.merchant.replace(/"/g, '""')}","${e.category}",${(e.amountCents / 100).toFixed(2)},"${e.source}",${(e.confidence * 100).toFixed(0)}%,${e.isSubscription ? 'Yes' : 'No'},"${(e.notes || '').replace(/"/g, '""')}"`
    );
    const expensesCSV = [expHeaders, ...expRows].join('\n');

    // Funds CSV
    const fundHeaders = ['ID,Name,Target_Amount,Current_Amount,Target_Date,Currency'];
    const fundRows = funds.map((f) =>
      `"${f.id}","${f.name.replace(/"/g, '""')}",${(f.targetAmountCents / 100).toFixed(2)},${(f.currentAmountCents / 100).toFixed(2)},"${f.targetDate}","${f.currency}"`
    );
    const fundsCSV = [fundHeaders, ...fundRows].join('\n');

    // Holdings CSV
    const holdHeaders = ['ID,Ticker,Asset_Type,Shares,Cost_Basis_USD,Current_Price_USD,Market_Value_USD'];
    const holdRows = holdings.map((h) => {
      const spot = quotes[h.ticker]?.price || 0;
      const marketVal = (h.shares * spot).toFixed(2);
      return `"${h.id}","${h.ticker}","${h.assetType}",${h.shares},${(h.totalCostCents / 100).toFixed(2)},${spot.toFixed(2)},${marketVal}`;
    });
    const holdingsCSV = [holdHeaders, ...holdRows].join('\n');

    return { expensesCSV, fundsCSV, holdingsCSV };
  };

  const wipeEverything = async () => {
    await wipeAllData();
    lockVault();
    setIsSetup(false);
    setSettings(DEFAULT_SETTINGS);
  };

  // Financial Computations & Net Worth Reconciliation
  // Net worth = bank cash + funds total + portfolio value
  // The parts must sum exactly to the total — always.
  const totalFundsCents = funds.reduce((sum, f) => {
    if (f.currency === 'INR' && fxRate && fxRate.rate > 0) {
      // Converted INR paise to USD cents
      return sum + Math.round(f.currentAmountCents / fxRate.rate);
    }
    return sum + f.currentAmountCents;
  }, 0);

  const totalPortfolioCents = holdings.reduce((sum, h) => {
    const quote = quotes[h.ticker];
    if (quote && quote.price > 0) {
      return sum + Math.round(h.shares * quote.price * 100);
    }
    // Fallback to cost basis if quote is not yet loaded
    return sum + h.totalCostCents;
  }, 0);

  // Net worth = bank cash + funds + portfolio − credit card balances owed
  // All four parts shown separately, summing exactly.
  const creditCardOwedCents = settings.creditCardOwedCents || 0;
  const totalNetWorthCents = settings.bankCashCents + totalFundsCents + totalPortfolioCents - creditCardOwedCents;

  // Safe to spend this month = income - fixed bills - fund allocations - budget already spent
  const currentMonth = new Date().toISOString().substring(0, 7);
  const spentThisMonthCents = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amountCents, 0);

  const fundAllocationsThisMonthCents = fundAllocations
    .filter((a) => a.date.startsWith(currentMonth) && a.type === 'deposit')
    .reduce((sum, a) => sum + a.amountCents, 0);

  const safeToSpendMonthCents = Math.max(
    0,
    settings.monthlyIncomeCents - settings.fixedBillsCents - fundAllocationsThisMonthCents - spentThisMonthCents
  );

  return (
    <StoreContext.Provider
      value={{
        isVaultReady,
        isSetup,
        isLocked,
        setupPin,
        unlockVault,
        lockVault,
        autoLockMinutes: settings.autoLockMinutes,
        expenses,
        categoryRules,
        budgets,
        funds,
        fundAllocations,
        fundAutoRules,
        holdings,
        corporateActions,
        settings,
        quotes,
        fxRate,
        refreshQuotes,
        isOffline,
        addExpense,
        addCategoryRule,
        setCategoryBudget,
        createFund,
        allocateFund,
        createFundAutoRule,
        addHolding,
        applyCorporateSplit,
        recordDividend,
        updateSettings,
        exportEncryptedBackup,
        importEncryptedBackup,
        exportCSVData,
        wipeEverything,
        totalNetWorthCents,
        totalFundsCents,
        totalPortfolioCents,
        creditCardOwedCents,
        safeToSpendMonthCents,
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
