'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Expense, ExpenseItem, CategoryRule, CustomCategory } from '@/lib/types';
import { STANDARD_CATEGORIES, categorizeMerchant } from '@/lib/aiCategorizer';
import { parseVoiceExpense } from '@/lib/voice';
import { performReceiptOCR, parseReceiptText, ParsedReceipt } from '@/lib/ocr';
import { parseBankCSV, BankCSVResult } from '@/lib/csvParsers';
import { detectSubscriptions, detectAnomalies } from '@/lib/subscriptionDetector';
import { formatMoney, SUPPORTED_CURRENCIES } from '@/lib/currencies';
import {
  Plus,
  Mic,
  Camera,
  Upload,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Trash2,
  Edit2,
  FileText,
  ChevronDown,
  ChevronUp,
  Coins,
  X,
} from 'lucide-react';

export function ExpenseModule({ filterCategory }: { filterCategory?: string | null }) {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    categoryRules,
    addCategoryRule,
    deleteCategoryRule,
    budgets,
    setCategoryBudget,
    deleteCategoryBudget,
    customCategories,
    addCustomCategory,
    renameCustomCategory,
    deleteCustomCategory,
    accounts,
    displayCurrency,
    rates,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'subscriptions' | 'budgets' | 'rules'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(filterCategory || 'ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [categoryRulePrompt, setCategoryRulePrompt] = useState<{ merchant: string; category: string } | null>(null);

  // Edit / Delete Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Manual Form State
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCurrency, setManualCurrency] = useState(displayCurrency || 'USD');
  const [manualCategory, setManualCategory] = useState('Groceries');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');
  const [manualAccountId, setManualAccountId] = useState<string>(accounts[0]?.id || '');
  const [manualEntryType, setManualEntryType] = useState<'debit' | 'credit'>('debit');

  // Edit Expense Form State
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [editCategory, setEditCategory] = useState('Groceries');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editEntryType, setEditEntryType] = useState<'debit' | 'credit'>('debit');

  // Voice State
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceParsed, setVoiceParsed] = useState<ReturnType<typeof parseVoiceExpense>>(null);

  // Receipt OCR State (Fix 8: Editable line items, tax, total + strict reconciliation gate)
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptTextPasted, setReceiptTextPasted] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrMerchant, setOcrMerchant] = useState('');
  const [ocrDate, setOcrDate] = useState(new Date().toISOString().split('T')[0]);
  const [ocrCurrency, setOcrCurrency] = useState(displayCurrency || 'USD');
  const [ocrAccountId, setOcrAccountId] = useState<string>(accounts[0]?.id || '');
  const [ocrTaxInput, setOcrTaxInput] = useState('0.00');
  const [ocrTotalInput, setOcrTotalInput] = useState('0.00');
  const [ocrItems, setOcrItems] = useState<ExpenseItem[]>([]);
  const [hasParsedReceipt, setHasParsedReceipt] = useState(false);

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvResult, setCsvResult] = useState<BankCSVResult | null>(null);

  // Custom Category State
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Combined Category List
  const allCategories = useMemo(() => {
    return [...STANDARD_CATEGORIES, ...customCategories.map((c) => c.name)];
  }, [customCategories]);

  // Subscriptions & Anomalies
  const subscriptions = useMemo(() => detectSubscriptions(expenses), [expenses]);
  const totalSubscriptionBurnCents = useMemo(() => {
    let sum = 0;
    subscriptions.forEach((s) => (sum += s.monthlyBurnCents));
    return sum;
  }, [subscriptions]);

  const anomalies = useMemo(() => detectAnomalies(expenses), [expenses]);

  // Current month vs previous month stats for Budgets
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthStr = prevDate.toISOString().substring(0, 7);

  const currentMonthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(currentMonthStr)), [expenses, currentMonthStr]);
  const prevMonthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(prevMonthStr)), [expenses, prevMonthStr]);

  // Filtered expenses
  const displayedExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory =
        selectedCategoryFilter === 'ALL' || e.category === selectedCategoryFilter;
      const matchAccount =
        selectedAccountFilter === 'ALL' ||
        (e.accountId && e.accountId === selectedAccountFilter);
      return matchSearch && matchCategory && matchAccount;
    });
  }, [expenses, searchQuery, selectedCategoryFilter, selectedAccountFilter]);

  const totalMoneyOutCents = useMemo(() => {
    return displayedExpenses
      .filter((e) => (e.entryType || 'debit') === 'debit')
      .reduce((sum, e) => sum + e.amountCents, 0);
  }, [displayedExpenses]);

  const totalMoneyInCents = useMemo(() => {
    return displayedExpenses
      .filter((e) => e.entryType === 'credit')
      .reduce((sum, e) => sum + e.amountCents, 0);
  }, [displayedExpenses]);

  // Manual Add Handler
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(manualAmount);
    if (!manualMerchant || isNaN(dollars) || dollars <= 0) return;

    const amountCents = Math.round(dollars * 100);
    const cat = categorizeMerchant(manualMerchant, categoryRules);

    await addExpense({
      merchant: manualMerchant.trim(),
      amountCents,
      currency: manualCurrency,
      category: manualCategory || cat.category,
      date: manualDate,
      source: 'manual',
      confidence: cat.confidence,
      notes: manualNotes.trim() || undefined,
      accountId: manualAccountId || undefined,
      entryType: manualEntryType,
    });

    setManualMerchant('');
    setManualAmount('');
    setManualNotes('');
    setIsManualModalOpen(false);
  };

  // Edit Expense Handlers
  const handleStartEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setEditMerchant(exp.merchant);
    setEditAmount((exp.amountCents / 100).toFixed(2));
    setEditCurrency(exp.currency || 'USD');
    setEditCategory(exp.category);
    setEditDate(exp.date);
    setEditNotes(exp.notes || '');
    setEditAccountId(exp.accountId || '');
    setEditEntryType(exp.entryType || 'debit');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const dollars = parseFloat(editAmount);
    if (!editMerchant || isNaN(dollars) || dollars <= 0) return;

    const amountCents = Math.round(dollars * 100);
    await updateExpense(editingExpense.id, {
      merchant: editMerchant.trim(),
      amountCents,
      currency: editCurrency,
      category: editCategory,
      date: editDate,
      notes: editNotes.trim() || undefined,
      accountId: editAccountId || undefined,
      entryType: editEntryType,
    });

    setEditingExpense(null);
  };

  // Delete Expense Handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirmExpense) return;
    await deleteExpense(deleteConfirmExpense.id);
    setDeleteConfirmExpense(null);
  };

  // FIX 19: Category Correction Bug Fix
  // Changing a transaction's category must update THAT transaction immediately
  // AND THEN offer to save a rule for future imports.
  const handleCategoryChange = async (exp: Expense, newCat: string) => {
    if (newCat === exp.category) return;

    // 1. Immediately update THAT transaction in the store
    await updateExpense(exp.id, { category: newCat });

    // 2. Offer to save a global rule for future transactions with this merchant
    setCategoryRulePrompt({
      merchant: exp.merchant,
      category: newCat,
    });
  };

  const confirmCreateRule = async () => {
    if (!categoryRulePrompt) return;
    await addCategoryRule(categoryRulePrompt.merchant, categoryRulePrompt.category);
    setCategoryRulePrompt(null);
  };

  // Voice Speech Recognition Handler
  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. You can type spoken phrases directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        const parsed = parseVoiceExpense(text, categoryRules);
        setVoiceParsed(parsed);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleVoiceTypeSubmit = () => {
    if (!voiceTranscript.trim()) return;
    const parsed = parseVoiceExpense(voiceTranscript, categoryRules);
    setVoiceParsed(parsed);
  };

  const confirmVoiceExpense = async () => {
    if (!voiceParsed || voiceParsed.amountCents <= 0) return;
    await addExpense({
      merchant: voiceParsed.merchant,
      amountCents: voiceParsed.amountCents,
      currency: displayCurrency || 'USD',
      category: voiceParsed.category,
      date: new Date().toISOString().split('T')[0],
      source: 'voice',
      confidence: voiceParsed.confidence,
      notes: `Voice input: "${voiceParsed.transcript}"`,
      entryType: 'debit',
    });
    setVoiceTranscript('');
    setVoiceParsed(null);
    setIsVoiceModalOpen(false);
  };

  // Receipt OCR Handler (Fix 8: Editable fields + Reconciliation Gate)
  const populateOcrState = (parsed: ParsedReceipt) => {
    setOcrMerchant(parsed.merchant || 'Store');
    setOcrDate(parsed.date || new Date().toISOString().split('T')[0]);
    setOcrCurrency(parsed.currency || displayCurrency || 'USD');
    setOcrTaxInput((parsed.taxCents / 100).toFixed(2));
    setOcrTotalInput((parsed.totalCents / 100).toFixed(2));
    setOcrItems(parsed.items.map((it) => ({ name: it.name, amountCents: it.amountCents })));
    setHasParsedReceipt(true);
  };

  const handleReceiptUpload = async (file: File) => {
    setIsOcrProcessing(true);
    try {
      const res = await performReceiptOCR(file);
      populateOcrState(res);
    } catch (err) {
      alert('Client OCR failed to process image. You can paste receipt text directly.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleReceiptTextParse = () => {
    if (!receiptTextPasted.trim()) return;
    const res = parseReceiptText(receiptTextPasted);
    populateOcrState(res);
  };

  // OCR Reconciliation calculations
  const ocrItemsSumCents = useMemo(() => {
    return ocrItems.reduce((sum, it) => sum + (it.amountCents || 0), 0);
  }, [ocrItems]);

  const ocrTaxCents = useMemo(() => {
    const val = parseFloat(ocrTaxInput);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }, [ocrTaxInput]);

  const ocrTotalCents = useMemo(() => {
    const val = parseFloat(ocrTotalInput);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }, [ocrTotalInput]);

  const isOcrReconciled = useMemo(() => {
    return ocrItemsSumCents + ocrTaxCents === ocrTotalCents && ocrTotalCents > 0;
  }, [ocrItemsSumCents, ocrTaxCents, ocrTotalCents]);

  const confirmReceiptExpense = async () => {
    if (!isOcrReconciled || ocrTotalCents <= 0) return;
    const cat = categorizeMerchant(ocrMerchant, categoryRules);

    await addExpense({
      merchant: ocrMerchant.trim(),
      amountCents: ocrTotalCents,
      currency: ocrCurrency,
      category: cat.category,
      date: ocrDate,
      source: 'receipt',
      confidence: 0.95,
      notes: `Receipt OCR: ${ocrItems.length} items. Subtotal $${(ocrItemsSumCents / 100).toFixed(2)}, Tax $${(ocrTaxCents / 100).toFixed(2)}`,
      accountId: ocrAccountId || undefined,
      entryType: 'debit',
      items: ocrItems,
    });

    setHasParsedReceipt(false);
    setOcrItems([]);
    setReceiptTextPasted('');
    setIsReceiptModalOpen(false);
  };

  // CSV Import Handler
  const handleCSVAnalyze = () => {
    if (!csvContent.trim()) return;
    const res = parseBankCSV(csvContent, categoryRules);
    setCsvResult(res);
  };

  const confirmCSVImport = async () => {
    if (!csvResult || csvResult.expenses.length === 0) return;
    for (const exp of csvResult.expenses) {
      await addExpense(exp);
    }
    setCsvContent('');
    setCsvResult(null);
    setIsCSVModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & 4 Ways to Add */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Expense Tracker</h2>
          <p className="text-xs text-[#9e9a93]">
            Four entry modes: Manual, Voice speech, Receipt OCR, or Bank CSV statement.
          </p>
        </div>

        {/* 4 Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-light px-3 py-2 text-xs font-semibold text-[#0b0d10] shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#262930] bg-[#171a21] px-3 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
          >
            <Mic className="h-4 w-4 text-gold-light" />
            <span>Voice Entry</span>
          </button>
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#262930] bg-[#171a21] px-3 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
          >
            <Camera className="h-4 w-4 text-gold-light" />
            <span>Receipt Scan</span>
          </button>
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#262930] bg-[#171a21] px-3 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
          >
            <Upload className="h-4 w-4 text-gold-light" />
            <span>Bank CSV</span>
          </button>
        </div>
      </div>

      {/* Anomaly Alerts Notification Banner */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>{anomalies.length} Financial Anomaly Alerts Detected</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {anomalies.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-[11px] text-amber-200/90">
                <span>{alert.message}</span>
                <span className="text-amber-400/60">{alert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#262930] pb-2">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'list'
              ? 'bg-gold text-[#0b0d10] font-semibold'
              : 'text-[#9e9a93] hover:text-[#f5f3ef]'
          }`}
        >
          All Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('subscriptions')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'subscriptions'
              ? 'bg-gold text-[#0b0d10] font-semibold'
              : 'text-[#9e9a93] hover:text-[#f5f3ef]'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Subscriptions ({subscriptions.size})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('budgets')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'budgets'
              ? 'bg-gold text-[#0b0d10] font-semibold'
              : 'text-[#9e9a93] hover:text-[#f5f3ef]'
          }`}
        >
          Category Budgets & MoM
        </button>
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'rules'
              ? 'bg-gold text-[#0b0d10] font-semibold'
              : 'text-[#9e9a93] hover:text-[#f5f3ef]'
          }`}
        >
          Rules & Categories ({categoryRules.length + customCategories.length})
        </button>
      </div>

      {/* VIEW 1: Expenses List */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Account Bucket Selector & Cash Flow Breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-1 rounded-xl border border-[#262930] bg-[#111419]/70 p-1">
              <button
                onClick={() => setSelectedAccountFilter('ALL')}
                className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
                  selectedAccountFilter === 'ALL'
                    ? 'bg-[#1e222b] text-gold-light font-semibold shadow border border-gold/30'
                    : 'text-[#9e9a93] hover:text-[#f5f3ef]'
                }`}
              >
                All Accounts
              </button>
              {accounts.slice(0, 3).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountFilter(acc.id)}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all truncate px-1 ${
                    selectedAccountFilter === acc.id
                      ? 'bg-[#1e222b] text-gold-light font-semibold shadow border border-gold/30'
                      : 'text-[#9e9a93] hover:text-[#f5f3ef]'
                  }`}
                  title={acc.name}
                >
                  {acc.name}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#262930] bg-[#111419]/70 px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#9e9a93]">Money Out (Debits)</span>
                <div className="text-base font-bold text-[#f5f3ef]">
                  -{formatMoney(totalMoneyOutCents, displayCurrency || 'USD')}
                </div>
              </div>
              <div className="text-[10px] text-[#716c64]">Expenses & Bills</div>
            </div>

            <div className="rounded-xl border border-[#262930] bg-[#111419]/70 px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#9e9a93]">Money In (Credits)</span>
                <div className="text-base font-bold text-gain">
                  +{formatMoney(totalMoneyInCents, displayCurrency || 'USD')}
                </div>
              </div>
              <div className="text-[10px] text-[#716c64]">Refunds & Inflow</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#716c64]" />
              <input
                type="text"
                placeholder="Search merchant, notes, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#262930] bg-[#111419]/80 py-2 pl-9 pr-3 text-xs text-[#f5f3ef] placeholder-[#716c64] focus:border-gold focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#9e9a93]" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="rounded-xl border border-[#262930] bg-[#111419]/80 px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table with Edit + Delete + Line Items */}
          <div className="overflow-hidden rounded-2xl border border-[#262930] bg-[#111419]/60 backdrop-blur-md">
            {displayedExpenses.length > 0 ? (
              <div className="divide-y divide-[#262930]">
                {displayedExpenses.map((exp) => {
                  const confPct = Math.round(exp.confidence * 100);
                  const isCredit = exp.entryType === 'credit';
                  const isExpanded = expandedExpenseId === exp.id;
                  const attachedAccount = accounts.find((a) => a.id === exp.accountId);

                  return (
                    <div key={exp.id} className="transition-colors hover:bg-[#171a21]/50">
                      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e222b] text-gold-light">
                            {exp.source === 'voice' && <Mic className="h-5 w-5" />}
                            {exp.source === 'receipt' && <Camera className="h-5 w-5" />}
                            {exp.source === 'csv' && <FileText className="h-5 w-5" />}
                            {exp.source === 'manual' && <Tag className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#f5f3ef]">{exp.merchant}</span>
                              {attachedAccount && (
                                <span className="rounded bg-[#1e222b] px-1.5 py-0.5 text-[10px] font-medium text-[#9e9a93] border border-[#262930]">
                                  {attachedAccount.name}
                                </span>
                              )}
                              {exp.isSubscription && (
                                <span className="rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold-light border border-gold/30">
                                  Subscription
                                </span>
                              )}
                              {exp.items && exp.items.length > 0 && (
                                <button
                                  onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                                  className="flex items-center gap-0.5 rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold-light hover:bg-gold/20"
                                >
                                  <span>{exp.items.length} items</span>
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9e9a93]">
                              <span>{exp.date}</span>
                              <span>•</span>
                              <span className="capitalize">{exp.source}</span>
                              <span>•</span>
                              {/* Category Selector with Immediate Update + Rule Prompt (Fix 19) */}
                              <select
                                value={exp.category}
                                onChange={(e) => handleCategoryChange(exp, e.target.value)}
                                className="rounded border border-[#262930] bg-[#171a21] px-1.5 py-0.5 text-[11px] text-[#f5f3ef] focus:outline-none focus:border-gold"
                              >
                                {allCategories.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <span
                                title={`Category confidence: ${confPct}%`}
                                className="rounded bg-[#1e222b] px-1.5 py-0.5 text-[10px] text-gold-light border border-gold/20"
                              >
                                {confPct}% conf
                              </span>
                            </div>
                            {exp.notes && (
                              <p className="mt-1 text-[11px] text-[#9e9a93] italic">{exp.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <div className={`text-base font-bold ${isCredit ? 'text-gain' : 'text-[#f5f3ef]'}`}>
                              {isCredit ? '+' : '-'}{formatMoney(exp.amountCents, exp.currency || displayCurrency || 'USD')}
                            </div>
                            <div className="text-[10px] text-[#716c64] capitalize">
                              {isCredit ? 'Money In' : 'Money Out'}
                            </div>
                          </div>

                          {/* Action Buttons: Edit + Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(exp)}
                              className="rounded-lg p-1.5 text-[#9e9a93] hover:bg-[#1e222b] hover:text-gold-light transition-colors"
                              title="Edit Expense"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmExpense(exp)}
                              className="rounded-lg p-1.5 text-[#9e9a93] hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Line Items Preview (Fix 8) */}
                      {isExpanded && exp.items && exp.items.length > 0 && (
                        <div className="border-t border-[#262930]/60 bg-[#0b0d10]/40 px-6 py-3">
                          <div className="text-[11px] font-semibold text-gold-light uppercase tracking-wider mb-2">
                            Parsed Receipt Line Items
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {exp.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1 border-b border-[#262930]/40">
                                <span className="text-[#c8c4bc]">{it.name}</span>
                                <span className="font-mono text-[#f5f3ef]">
                                  {formatMoney(it.amountCents, exp.currency || displayCurrency || 'USD')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-[#9e9a93]">
                No expenses found. Add an expense using Manual, Voice, Receipt, or CSV import.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Subscriptions Dashboard */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#262930] bg-[#111419]/70 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#f5f3ef]">Monthly Subscription Burn</h3>
                <p className="text-xs text-[#9e9a93]">
                  Strict 4-condition rule: same merchant, ≥3 charges, 24–35 day intervals, ±5% consistency or qualifying hike.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gold-light">
                  {formatMoney(totalSubscriptionBurnCents, displayCurrency || 'USD')}
                </span>
                <span className="text-xs text-[#9e9a93]"> / month</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(subscriptions.values()).map((sub) => (
              <div
                key={sub.merchant}
                className="rounded-2xl border border-[#262930] bg-[#111419]/70 p-5 shadow-lg backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#f5f3ef]">{sub.merchant}</span>
                  <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] text-gold-light border border-gold/30">
                    {sub.transactionCount} charges
                  </span>
                </div>
                <div className="mt-3 text-xl font-bold text-[#f5f3ef]">
                  {formatMoney(sub.monthlyBurnCents, displayCurrency || 'USD')}
                  <span className="text-xs font-normal text-[#9e9a93]"> / mo</span>
                </div>

                {sub.priceIncreaseCents && sub.priceIncreaseCents > 0 ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-loss">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Price increased by +{formatMoney(sub.priceIncreaseCents, displayCurrency || 'USD')}!</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[#9e9a93]">
                    Stable recurring fee
                  </div>
                )}
                <div className="mt-3 text-[11px] text-[#716c64]">
                  Last charged on {sub.lastDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Budgets & Month-over-Month Comparison */}
      {activeSubTab === 'budgets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allCategories.map((cat) => {
              const spentCurrent = currentMonthExpenses
                .filter((e) => e.category === cat)
                .reduce((s, e) => s + e.amountCents, 0);

              const spentPrev = prevMonthExpenses
                .filter((e) => e.category === cat)
                .reduce((s, e) => s + e.amountCents, 0);

              const budgetObj = budgets.find((b) => b.category === cat);
              const limitCents = budgetObj?.monthlyLimitCents || 0;
              const pct = limitCents > 0 ? Math.min(100, Math.round((spentCurrent / limitCents) * 100)) : 0;

              let momText = 'No prior spend';
              if (spentPrev > 0) {
                const ratio = spentCurrent / spentPrev;
                momText = `${ratio.toFixed(1)}x vs last month`;
              }

              return (
                <div key={cat} className="rounded-2xl border border-[#262930] bg-[#111419]/70 p-5 shadow-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#f5f3ef]">{cat}</span>
                    <span className="text-[#9e9a93]">{momText}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-[#f5f3ef]">
                      {formatMoney(spentCurrent, displayCurrency || 'USD')}
                    </span>
                    <span className="text-xs text-[#9e9a93]">
                      Limit: {limitCents > 0 ? formatMoney(limitCents, displayCurrency || 'USD') : 'None'}
                    </span>
                  </div>

                  {limitCents > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-semibold ${
                          pct >= 100 ? 'text-rose-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {pct}% used
                        </span>
                        <span className="text-[#9e9a93]">
                          {pct >= 100 ? 'Over Budget' : `${formatMoney(Math.max(0, limitCents - spentCurrent), displayCurrency || 'USD')} left`}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e222b]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-between items-center text-[11px]">
                    {limitCents > 0 && (
                      <button
                        onClick={() => deleteCategoryBudget(cat)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        Remove Limit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const newLim = prompt(`Set monthly budget for ${cat}:`, limitCents > 0 ? (limitCents / 100).toString() : '500');
                        if (newLim !== null) {
                          const val = parseFloat(newLim);
                          if (!isNaN(val)) {
                            setCategoryBudget(cat, Math.round(val * 100));
                          }
                        }
                      }}
                      className="text-gold-light hover:text-gold ml-auto"
                    >
                      {limitCents > 0 ? 'Edit Limit' : 'Set Budget'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: Learned Rules & Custom Categories */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Custom Categories Section */}
          <div className="rounded-2xl border border-[#262930] bg-[#111419]/70 p-5 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-[#f5f3ef]">Custom Categories</h3>
            <p className="text-xs text-[#9e9a93]">
              Add your own custom spending categories. Deleting a category reassigns existing transactions to Miscellaneous.
            </p>

            {/* Add Custom Category Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                await addCustomCategory(newCatName.trim());
                setNewCatName('');
              }}
              className="mt-4 flex gap-2"
            >
              <input
                type="text"
                placeholder="New category name (e.g. Pet Supplies, Hobbies)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
              >
                Add Category
              </button>
            </form>

            {/* Custom Categories List */}
            <div className="mt-4 space-y-2">
              {customCategories.length > 0 ? (
                customCategories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-[#262930] bg-[#0b0d10]/60 p-3 text-xs">
                    {editingCatId === c.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 rounded-lg border border-gold/40 bg-[#171a21] px-2 py-1 text-xs text-[#f5f3ef] focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            if (editingCatName.trim()) {
                              await renameCustomCategory(c.id, editingCatName.trim());
                              setEditingCatId(null);
                            }
                          }}
                          className="rounded-lg bg-gold px-2.5 py-1 text-xs font-semibold text-[#0b0d10]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold text-[#f5f3ef]">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCatId(c.id);
                              setEditingCatName(c.name);
                            }}
                            className="text-[11px] text-gold-light hover:underline"
                          >
                            Rename
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete custom category "${c.name}"? All transactions using it will be moved to Miscellaneous.`)) {
                                await deleteCustomCategory(c.id);
                              }
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#716c64] italic">No custom categories created yet.</div>
              )}
            </div>
          </div>

          {/* Global Categorization Rules Section */}
          <div className="rounded-2xl border border-[#262930] bg-[#111419]/70 p-5 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-[#f5f3ef]">Global Categorization Rules</h3>
            <p className="text-xs text-[#9e9a93]">
              Keyword rules learned from user adjustments. Future imports for these merchants map automatically.
            </p>

            <div className="mt-4 divide-y divide-[#262930] rounded-2xl border border-[#262930] bg-[#111419]/50">
              {categoryRules.length > 0 ? (
                categoryRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 text-xs">
                    <div>
                      <span className="font-semibold text-[#f5f3ef]">{rule.merchantPattern}</span>
                      <span className="text-[#9e9a93]"> always maps to </span>
                      <span className="rounded bg-gold/10 px-2 py-0.5 text-gold-light font-medium border border-gold/30">
                        {rule.category}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete rule mapping "${rule.merchantPattern}" to "${rule.category}"?`)) {
                          await deleteCategoryRule(rule.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#9e9a93]">
                  No custom rules yet. Re-categorize any merchant to establish a global rule.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Rule Prompt Modal (Fix 19) */}
      {categoryRulePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-[#f5f3ef]">Save Global Rule?</h4>
            <p className="mt-2 text-xs text-[#c8c4bc]">
              Transaction category updated! Would you also like to always categorize future transactions from <strong className="text-gold-light">{categoryRulePrompt.merchant}</strong> as <strong className="text-gold-light">{categoryRulePrompt.category}</strong>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCategoryRulePrompt(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                No, this time only
              </button>
              <button
                onClick={confirmCreateRule}
                className="rounded-lg bg-gradient-to-r from-gold to-gold-light px-3 py-1.5 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
              >
                Save Global Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Expense Confirmation */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-[#f5f3ef]">Delete Expense</h4>
            <p className="mt-2 text-xs text-[#c8c4bc]">
              Are you sure you want to delete the expense of <strong className="text-gold-light">{formatMoney(deleteConfirmExpense.amountCents, deleteConfirmExpense.currency || displayCurrency || 'USD')}</strong> at <strong className="text-[#f5f3ef]">{deleteConfirmExpense.merchant}</strong> on {deleteConfirmExpense.date}?
            </p>
            <p className="mt-1 text-[11px] text-[#716c64]">
              This will update your net worth and safe-to-spend totals immediately.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Expense */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#f5f3ef]">Edit Expense</h3>
              <button onClick={() => setEditingExpense(null)} className="text-[#9e9a93] hover:text-[#f5f3ef]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Merchant / Payee</label>
                <input
                  type="text"
                  required
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Attached Account</label>
                  <select
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    <option value="">None (Generic)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Direction</label>
                  <select
                    value={editEntryType}
                    onChange={(e) => setEditEntryType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    <option value="debit">Money Out (Debit)</option>
                    <option value="credit">Money In (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Manual Entry */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Add Expense Manually</h3>
            <form onSubmit={handleManualAdd} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Merchant / Payee</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Whole Foods, Shell, Netflix"
                  value={manualMerchant}
                  onChange={(e) => {
                    setManualMerchant(e.target.value);
                    const suggested = categorizeMerchant(e.target.value, categoryRules);
                    setManualCategory(suggested.category);
                  }}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Currency</label>
                  <select
                    value={manualCurrency}
                    onChange={(e) => setManualCurrency(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">Source Account</label>
                  <select
                    value={manualAccountId}
                    onChange={(e) => setManualAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    <option value="">None (Generic)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Direction</label>
                  <select
                    value={manualEntryType}
                    onChange={(e) => setManualEntryType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  >
                    <option value="debit">Money Out (Debit)</option>
                    <option value="credit">Money In (Credit / Refund)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional context"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Voice Entry */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Voice Entry (Web Speech API)</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Speak or type a spoken sentence: e.g. &quot;spent $40 on groceries&quot; or &quot;$15.50 at Starbucks&quot;.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={startVoiceRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : 'bg-gradient-to-r from-gold to-gold-light text-[#0b0d10] hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                }`}
              >
                <Mic className="h-7 w-7" />
              </button>
              <span className="text-xs text-[#9e9a93] font-medium">
                {isListening ? 'Listening... Speak now' : 'Click microphone to record'}
              </span>
            </div>

            <div className="mt-4">
              <label className="text-xs text-[#9e9a93]">Or type speech phrase directly:</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder='e.g. spent $40 on groceries'
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVoiceTypeSubmit}
                  className="rounded-xl border border-[#262930] bg-[#171a21] px-3 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
                >
                  Parse
                </button>
              </div>
            </div>

            {voiceParsed && (
              <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-[#f5f3ef]">
                <div className="font-semibold text-gold-light">Parsed Expense:</div>
                <div className="mt-1">Merchant: <strong>{voiceParsed.merchant}</strong></div>
                <div>Amount: <strong>${(voiceParsed.amountCents / 100).toFixed(2)}</strong></div>
                <div>Category: <strong>{voiceParsed.category}</strong></div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!voiceParsed || voiceParsed.amountCents <= 0}
                onClick={confirmVoiceExpense}
                className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110 disabled:opacity-50"
              >
                Confirm & Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Receipt OCR with Editable Items & Reconciliation Gate (Fix 8) */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#f5f3ef]">Receipt Photo OCR (Tesseract.js)</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              100% Client-side optical character recognition. All fields and line items are editable before saving.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-[#9e9a93]">Upload Receipt Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleReceiptUpload(e.target.files[0]);
                    }
                  }}
                  className="mt-1 w-full text-xs text-[#9e9a93] file:mr-3 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-gold file:to-gold-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0b0d10] hover:file:brightness-110"
                />
              </div>

              <div>
                <label className="text-xs text-[#9e9a93]">Or paste receipt text directly:</label>
                <textarea
                  rows={4}
                  placeholder={`TRADER JOE'S\nOrganic Milk $4.99\nBananas $1.29\nSourdough Bread $3.99\nSubtotal: $10.27\nTax: $0.82\nGrand Total: $11.09`}
                  value={receiptTextPasted}
                  onChange={(e) => setReceiptTextPasted(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] p-2.5 font-mono text-[11px] text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleReceiptTextParse}
                  className="mt-1.5 rounded-lg border border-[#262930] bg-[#171a21] px-3 py-1.5 text-xs text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
                >
                  Parse Text
                </button>
              </div>

              {isOcrProcessing && (
                <div className="flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-xs text-gold-light">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing client-side Tesseract.js OCR model...</span>
                </div>
              )}

              {/* Editable Parsed Fields & Line Items */}
              {hasParsedReceipt && (
                <div className="rounded-xl border border-[#262930] bg-[#0b0d10]/80 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#9e9a93]">Merchant</label>
                      <input
                        type="text"
                        value={ocrMerchant}
                        onChange={(e) => setOcrMerchant(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#262930] bg-[#171a21] px-2.5 py-1.5 text-xs text-[#f5f3ef]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9e9a93]">Date</label>
                      <input
                        type="date"
                        value={ocrDate}
                        onChange={(e) => setOcrDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#262930] bg-[#171a21] px-2.5 py-1.5 text-xs text-[#f5f3ef]"
                      />
                    </div>
                  </div>

                  {/* Line Items List with Edit/Delete/Add */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#f5f3ef] mb-1">
                      <span>Line Items ({ocrItems.length})</span>
                      <button
                        type="button"
                        onClick={() => setOcrItems([...ocrItems, { name: 'New Item', amountCents: 100 }])}
                        className="text-[11px] text-gold-light hover:underline"
                      >
                        + Add Item
                      </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {ocrItems.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => {
                              const updated = [...ocrItems];
                              updated[idx] = { ...it, name: e.target.value };
                              setOcrItems(updated);
                            }}
                            className="flex-1 rounded-lg border border-[#262930] bg-[#171a21] px-2 py-1 text-xs text-[#f5f3ef]"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={(it.amountCents / 100).toFixed(2)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const updated = [...ocrItems];
                              updated[idx] = { ...it, amountCents: isNaN(val) ? 0 : Math.round(val * 100) };
                              setOcrItems(updated);
                            }}
                            className="w-20 rounded-lg border border-[#262930] bg-[#171a21] px-2 py-1 text-xs text-[#f5f3ef] text-right font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setOcrItems(ocrItems.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tax & Total */}
                  <div className="grid grid-cols-2 gap-3 border-t border-[#262930] pt-2">
                    <div>
                      <label className="text-[11px] text-[#9e9a93]">Tax Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ocrTaxInput}
                        onChange={(e) => setOcrTaxInput(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#262930] bg-[#171a21] px-2.5 py-1.5 text-xs text-[#f5f3ef]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9e9a93]">Grand Total ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ocrTotalInput}
                        onChange={(e) => setOcrTotalInput(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#262930] bg-[#171a21] px-2.5 py-1.5 text-xs text-[#f5f3ef] font-bold"
                      />
                    </div>
                  </div>

                  {/* Reconciliation Gate Display (Fix 8) */}
                  <div className={`rounded-xl p-3 text-xs ${
                    isOcrReconciled
                      ? 'border border-gain/30 bg-gain/10 text-gain'
                      : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}>
                    <div className="flex items-center justify-between font-semibold">
                      <span>Reconciliation Check:</span>
                      <span>
                        Items (${(ocrItemsSumCents / 100).toFixed(2)}) + Tax (${(ocrTaxCents / 100).toFixed(2)}) = ${( (ocrItemsSumCents + ocrTaxCents) / 100 ).toFixed(2)}
                      </span>
                    </div>
                    {!isOcrReconciled && (
                      <p className="mt-1 text-[11px] text-amber-200">
                        Mismatch of ${Math.abs((ocrItemsSumCents + ocrTaxCents - ocrTotalCents) / 100).toFixed(2)} with Grand Total (${(ocrTotalCents / 100).toFixed(2)}). Reconciliation must match to the exact cent to import.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isOcrReconciled || ocrTotalCents <= 0}
                onClick={confirmReceiptExpense}
                className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110 disabled:opacity-40"
              >
                Import Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Bank CSV Import */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f3ef]">Import Bank Statement CSV</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Supports Chase, Bank of America, American Express CSV files. No bank sync required.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">Paste Bank Statement CSV text:</label>
                <textarea
                  rows={5}
                  placeholder={`Transaction Date,Post Date,Description,Category,Type,Amount\n11/01/2026,11/02/2026,NETFLIX.COM,Entertainment,Sale,-15.49\n10/01/2026,10/02/2026,NETFLIX.COM,Entertainment,Sale,-15.49\n09/01/2026,09/02/2026,NETFLIX.COM,Entertainment,Sale,-15.49`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] p-2.5 font-mono text-[11px] text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCSVAnalyze}
                className="rounded-xl border border-[#262930] bg-[#171a21] px-3 py-1.5 text-xs font-medium text-[#f5f3ef] hover:border-gold/40 hover:bg-[#1e222b]"
              >
                Analyze CSV Format
              </button>

              {csvResult && (
                <div className="rounded-xl border border-[#262930] bg-[#171a21]/50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-[#f5f3ef]">
                    <span>Format: {csvResult.detectedFormat}</span>
                    <span className="text-gold-light">{csvResult.expenses.length} valid transactions</span>
                  </div>

                  {csvResult.unparsedRows.length > 0 && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 text-[11px]">
                      <div className="font-semibold">{csvResult.unparsedRows.length} Unparsed Rows:</div>
                      {csvResult.unparsedRows.slice(0, 3).map((r, i) => (
                        <div key={i}>Row {r.rowNumber}: {r.reason}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCSVModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!csvResult || csvResult.expenses.length === 0}
                onClick={confirmCSVImport}
                className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110 disabled:opacity-50"
              >
                Import {csvResult?.expenses.length || 0} Transactions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
