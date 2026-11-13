'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Expense, TransactionSource, CategoryRule } from '@/lib/types';
import { STANDARD_CATEGORIES, categorizeMerchant } from '@/lib/aiCategorizer';
import { parseVoiceExpense } from '@/lib/voice';
import { performReceiptOCR, parseReceiptText, ParsedReceipt } from '@/lib/ocr';
import { parseBankCSV, BankCSVResult } from '@/lib/csvParsers';
import { detectSubscriptions, detectAnomalies } from '@/lib/subscriptionDetector';
import {
  Plus,
  Mic,
  Camera,
  Upload,
  Sparkles,
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
  FileText,
  Volume2,
} from 'lucide-react';

export function ExpenseModule({ filterCategory }: { filterCategory?: string | null }) {
  const {
    expenses,
    addExpense,
    categoryRules,
    addCategoryRule,
    budgets,
    setCategoryBudget,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'subscriptions' | 'budgets' | 'rules'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(filterCategory || 'ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<'ALL' | 'bank' | 'credit' | 'cash'>('ALL');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [categoryRulePrompt, setCategoryRulePrompt] = useState<{ merchant: string; category: string } | null>(null);

  // Manual Form State
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('Groceries');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');
  const [manualAccountType, setManualAccountType] = useState<'bank' | 'credit' | 'cash'>('bank');
  const [manualEntryType, setManualEntryType] = useState<'debit' | 'credit'>('debit');

  // Voice State
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceParsed, setVoiceParsed] = useState<ReturnType<typeof parseVoiceExpense>>(null);

  // Receipt OCR State
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptTextPasted, setReceiptTextPasted] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvResult, setCsvResult] = useState<BankCSVResult | null>(null);

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
        selectedAccountFilter === 'ALL' || (e.accountType || 'bank') === selectedAccountFilter;
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
      category: manualCategory || cat.category,
      date: manualDate,
      source: 'manual',
      confidence: cat.confidence,
      notes: manualNotes.trim() || undefined,
      accountType: manualAccountType,
      entryType: manualEntryType,
    });

    setManualMerchant('');
    setManualAmount('');
    setManualNotes('');
    setIsManualModalOpen(false);
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
      category: voiceParsed.category,
      date: new Date().toISOString().split('T')[0],
      source: 'voice',
      confidence: voiceParsed.confidence,
      notes: `Voice input: "${voiceParsed.transcript}"`,
      accountType: 'bank',
      entryType: 'debit',
    });
    setVoiceTranscript('');
    setVoiceParsed(null);
    setIsVoiceModalOpen(false);
  };

  // Receipt OCR Handler
  const handleReceiptUpload = async (file: File) => {
    setIsOcrProcessing(true);
    try {
      const res = await performReceiptOCR(file);
      setParsedReceipt(res);
    } catch (err) {
      alert('Client OCR failed to process image. You can paste receipt text directly.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleReceiptTextParse = () => {
    if (!receiptTextPasted.trim()) return;
    const res = parseReceiptText(receiptTextPasted);
    setParsedReceipt(res);
  };

  const confirmReceiptExpense = async () => {
    if (!parsedReceipt || parsedReceipt.totalCents <= 0) return;
    const cat = categorizeMerchant(parsedReceipt.merchant, categoryRules);
    await addExpense({
      merchant: parsedReceipt.merchant,
      amountCents: parsedReceipt.totalCents,
      category: cat.category,
      date: parsedReceipt.date,
      source: 'receipt',
      confidence: parsedReceipt.confidence,
      notes: `Receipt OCR: ${parsedReceipt.items.length} items parsed. Subtotal $${(parsedReceipt.subtotalCents / 100).toFixed(2)}, Tax $${(parsedReceipt.taxCents / 100).toFixed(2)}`,
      accountType: 'bank',
      entryType: 'debit',
    });
    setParsedReceipt(null);
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

  // User Category Correction Rule Learning
  const handleCategoryChange = (exp: Expense, newCat: string) => {
    if (newCat === exp.category) return;
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

  return (
    <div className="space-y-6">
      {/* Top Header & 4 Ways to Add */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Expense Tracker</h2>
          <p className="text-xs text-slate-400">
            Four entry modes: Manual, Voice speech, Receipt OCR, or Bank CSV statement.
          </p>
        </div>

        {/* 4 Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md hover:bg-teal-400"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Mic className="h-4 w-4 text-teal-400" />
            <span>Voice Entry</span>
          </button>
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Camera className="h-4 w-4 text-amber-400" />
            <span>Receipt Scan</span>
          </button>
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Upload className="h-4 w-4 text-indigo-400" />
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
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'list'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('subscriptions')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'subscriptions'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
          <span>Subscriptions ({subscriptions.size})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('budgets')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'budgets'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Category Budgets & MoM
        </button>
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSubTab === 'rules'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Learned Rules ({categoryRules.length})
        </button>
      </div>

      {/* VIEW 1: Expenses List */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Account Bucket Selector & Cash Flow Breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
              {(['ALL', 'bank', 'credit', 'cash'] as const).map((acc) => (
                <button
                  key={acc}
                  onClick={() => setSelectedAccountFilter(acc)}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all ${
                    selectedAccountFilter === acc
                      ? 'bg-slate-800 text-teal-400 font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {acc === 'ALL' ? 'All Accounts' : acc === 'bank' ? 'Bank' : acc === 'credit' ? 'Credit Card' : 'Cash'}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Money Out (Debits)</span>
                <div className="text-base font-bold text-white">
                  -${(totalMoneyOutCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-[10px] text-slate-500">Expenses & Bills</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Money In (Credits)</span>
                <div className="text-base font-bold text-emerald-400">
                  +${(totalMoneyInCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-[10px] text-slate-500">Refunds & Inflow</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search merchant, notes, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {STANDARD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md">
            {displayedExpenses.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {displayedExpenses.map((exp) => {
                  const confPct = Math.round(exp.confidence * 100);
                  const isCredit = exp.entryType === 'credit';
                  const acc = exp.accountType || 'bank';
                  return (
                    <div
                      key={exp.id}
                      className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-400">
                          {exp.source === 'voice' && <Mic className="h-5 w-5" />}
                          {exp.source === 'receipt' && <Camera className="h-5 w-5" />}
                          {exp.source === 'csv' && <FileText className="h-5 w-5" />}
                          {exp.source === 'manual' && <Tag className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{exp.merchant}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              acc === 'credit'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : acc === 'cash'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {acc}
                            </span>
                            {exp.isSubscription && (
                              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300 border border-teal-500/20">
                                Subscription
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{exp.date}</span>
                            <span>•</span>
                            <span className="capitalize">{exp.source}</span>
                            <span>•</span>
                            {/* Category Selector with Rule Learning trigger */}
                            <select
                              value={exp.category}
                              onChange={(e) => handleCategoryChange(exp, e.target.value)}
                              className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-200 focus:outline-none"
                            >
                              {STANDARD_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <span
                              title={`Category confidence: ${confPct}%`}
                              className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-teal-400"
                            >
                              {confPct}% conf
                            </span>
                          </div>
                          {exp.notes && (
                            <p className="mt-1 text-[11px] text-slate-400 italic">{exp.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-base font-bold ${isCredit ? 'text-emerald-400' : 'text-white'}`}>
                          {isCredit ? '+' : '-'}${(exp.amountCents / 100).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {isCredit ? 'Money In' : 'Money Out'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500">
                No expenses found. Add an expense using Manual, Voice, Receipt, or CSV import.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Subscriptions Dashboard */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Monthly Subscription Burn</h3>
                <p className="text-xs text-slate-400">
                  Detected automatically based on recurring merchant charges (±5% recurring monthly)
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-teal-400">
                  ${(totalSubscriptionBurnCents / 100).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(subscriptions.values()).map((sub) => (
              <div
                key={sub.merchant}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{sub.merchant}</span>
                  <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-400 border border-teal-500/20">
                    {sub.transactionCount} charges
                  </span>
                </div>
                <div className="mt-3 text-xl font-bold text-white">
                  ${(sub.monthlyBurnCents / 100).toFixed(2)}
                  <span className="text-xs font-normal text-slate-400"> / mo</span>
                </div>

                {sub.priceIncreaseCents && sub.priceIncreaseCents > 0 ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Price increased by +${(sub.priceIncreaseCents / 100).toFixed(2)} vs previous charge!</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400">
                    Stable recurring fee
                  </div>
                )}
                <div className="mt-3 text-[11px] text-slate-400">
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
            {STANDARD_CATEGORIES.map((cat) => {
              const spentCurrent = currentMonthExpenses
                .filter((e) => e.category === cat)
                .reduce((s, e) => s + e.amountCents, 0);

              const spentPrev = prevMonthExpenses
                .filter((e) => e.category === cat)
                .reduce((s, e) => s + e.amountCents, 0);

              const budgetObj = budgets.find((b) => b.category === cat);
              const limitCents = budgetObj?.monthlyLimitCents || 0;
              const pct = limitCents > 0 ? Math.min(100, Math.round((spentCurrent / limitCents) * 100)) : 0;

              // Month over Month multiplier
              let momText = 'No prior spend';
              if (spentPrev > 0) {
                const ratio = spentCurrent / spentPrev;
                momText = `${ratio.toFixed(1)}x vs last month`;
              }

              return (
                <div key={cat} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{cat}</span>
                    <span className="text-slate-400">{momText}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-white">
                      ${(spentCurrent / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Limit: ${limitCents > 0 ? (limitCents / 100).toFixed(0) : 'None'}
                    </span>
                  </div>

                  {limitCents > 0 && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-teal-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        const newLim = prompt(`Set monthly budget for ${cat} in dollars:`, limitCents > 0 ? (limitCents / 100).toString() : '500');
                        if (newLim !== null) {
                          const val = parseFloat(newLim);
                          if (!isNaN(val)) {
                            setCategoryBudget(cat, Math.round(val * 100));
                          }
                        }
                      }}
                      className="text-[11px] text-teal-400 hover:text-teal-300"
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

      {/* VIEW 4: Learned Rules */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white">Global Categorization Rules</h3>
            <p className="text-xs text-slate-400">
              When you re-categorize an expense, FundPilot learns a global rule for that merchant.
            </p>
          </div>

          <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/50">
            {categoryRules.length > 0 ? (
              categoryRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <span className="font-semibold text-white">{rule.merchantPattern}</span>
                    <span className="text-slate-400"> always maps to </span>
                    <span className="rounded bg-teal-500/10 px-2 py-0.5 text-teal-300 font-medium">
                      {rule.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Active Rule</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No custom rules yet. Re-categorize any merchant to establish a global rule.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Rule Prompt Modal */}
      {categoryRulePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-sm font-bold text-white">Save Global Rule?</h4>
            <p className="mt-2 text-xs text-slate-300">
              Would you like to always categorize merchant <strong className="text-teal-400">{categoryRulePrompt.merchant}</strong> as <strong className="text-teal-400">{categoryRulePrompt.category}</strong> for future imports?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCategoryRulePrompt(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                No, this time only
              </button>
              <button
                onClick={confirmCreateRule}
                className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400"
              >
                Save Global Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Manual Entry */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add Expense Manually</h3>
            <form onSubmit={handleManualAdd} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400">Merchant / Payee</label>
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
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Amount ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Account Bucket</label>
                  <select
                    value={manualAccountType}
                    onChange={(e) => setManualAccountType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="bank">Bank / Debit</option>
                    <option value="credit">Credit Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Direction</label>
                  <select
                    value={manualEntryType}
                    onChange={(e) => setManualEntryType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="debit">Money Out (Debit)</option>
                    <option value="credit">Money In (Credit / Refund)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Category</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional context"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Voice Entry (Web Speech API)</h3>
            <p className="mt-1 text-xs text-slate-400">
              Speak or type a spoken sentence: e.g. &quot;spent $40 on groceries&quot; or &quot;$15.50 at Starbucks&quot;.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={startVoiceRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.4)]'
                }`}
              >
                <Mic className="h-7 w-7" />
              </button>
              <span className="text-xs text-slate-400 font-medium">
                {isListening ? 'Listening... Speak now' : 'Click microphone to record'}
              </span>
            </div>

            <div className="mt-4">
              <label className="text-xs text-slate-400">Or type speech phrase directly:</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder='e.g. spent $40 on groceries'
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVoiceTypeSubmit}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  Parse
                </button>
              </div>
            </div>

            {/* Parsed Result Preview */}
            {voiceParsed && (
              <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-200">
                <div className="font-semibold text-white">Parsed Expense:</div>
                <div className="mt-1">Merchant: <strong>{voiceParsed.merchant}</strong></div>
                <div>Amount: <strong>${(voiceParsed.amountCents / 100).toFixed(2)}</strong></div>
                <div>Category: <strong>{voiceParsed.category}</strong> ({Math.round(voiceParsed.confidence * 100)}% AI confidence)</div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!voiceParsed || voiceParsed.amountCents <= 0}
                onClick={confirmVoiceExpense}
                className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                Confirm & Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Receipt OCR */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Receipt Photo OCR (Tesseract.js)</h3>
            <p className="mt-1 text-xs text-slate-400">
              100% Client-side optical character recognition. Upload an image or paste receipt text.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400">Upload Receipt Image (PNG / JPG)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleReceiptUpload(e.target.files[0]);
                    }
                  }}
                  className="mt-1 w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-teal-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Or paste receipt text (Acceptance Check 2):</label>
                <textarea
                  rows={4}
                  placeholder={`TRADER JOE'S\nOrganic Milk $4.99\nBananas $1.29\nSourdough Bread $3.99\nSubtotal: $10.27\nTax: $0.82\nGrand Total: $11.09`}
                  value={receiptTextPasted}
                  onChange={(e) => setReceiptTextPasted(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleReceiptTextParse}
                  className="mt-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Parse Text
                </button>
              </div>

              {isOcrProcessing && (
                <div className="flex items-center gap-2 rounded-xl bg-teal-500/10 p-3 text-xs text-teal-300">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing client-side Tesseract.js OCR model...</span>
                </div>
              )}

              {parsedReceipt && (
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{parsedReceipt.merchant}</span>
                    <span>Total: ${(parsedReceipt.totalCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-teal-300">
                    Line items ({parsedReceipt.items.length}):
                  </div>
                  <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-slate-300">
                    {parsedReceipt.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.name}</span>
                        <span>${(it.amountCents / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between border-t border-teal-500/20 pt-1 text-[11px] font-semibold text-teal-200">
                    <span>Grand Total Matches:</span>
                    <span>${(parsedReceipt.totalCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!parsedReceipt || parsedReceipt.totalCents <= 0}
                onClick={confirmReceiptExpense}
                className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                Import Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Bank CSV Import */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Import Bank Statement CSV</h3>
            <p className="mt-1 text-xs text-slate-400">
              Supports Chase, Bank of America, American Express CSV files. No bank sync required.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400">Paste Bank Statement CSV text:</label>
                <textarea
                  rows={5}
                  placeholder={`Transaction Date,Post Date,Description,Category,Type,Amount\n11/01/2026,11/02/2026,NETFLIX.COM,Entertainment,Sale,-15.49\n10/01/2026,10/02/2026,NETFLIX.COM,Entertainment,Sale,-15.49\n09/01/2026,09/02/2026,NETFLIX.COM,Entertainment,Sale,-15.49`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCSVAnalyze}
                className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Analyze CSV Format
              </button>

              {csvResult && (
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span>Format: {csvResult.detectedFormat}</span>
                    <span className="text-teal-400">{csvResult.expenses.length} valid transactions</span>
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
                className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!csvResult || csvResult.expenses.length === 0}
                onClick={confirmCSVImport}
                className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
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
