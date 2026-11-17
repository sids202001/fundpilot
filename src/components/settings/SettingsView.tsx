'use client';

import React, { useState, useEffect } from 'react';
import { useStore, getLocalDate } from '@/lib/store';
import { CURRENCY_REGISTRY, formatMoney, convertCurrency } from '@/lib/currencies';
import { generateRecoveryKey, selectVerificationIndices } from '@/lib/bip39';
import { getVaultMeta } from '@/lib/db';
import { verifyPinAndDeriveKey } from '@/lib/crypto';
import {
  Settings,
  KeyRound,
  Shield,
  ShieldAlert,
  Clock,
  Coins,
  Eye,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Copy,
  Check,
  Wallet,
  Plus,
} from 'lucide-react';

export function SettingsView() {
  const {
    settings,
    updateSettings,
    changePin,
    rotateRecoveryKey,
    exportSyncBundle,
    importSyncBundle,
    exportEncryptedBackup,
    importEncryptedBackup,
    exportCSVData,
    wipeEverything,
    displayCurrency,
    accounts,
    addAccount,
    deleteAccount,
    expenses,
    funds,
    investments,
    rates,
    fxRate,
  } = useStore();

  // Change PIN State (Item 1: Mandatory New Recovery Key Issue)
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isPinRecoveryModalOpen, setIsPinRecoveryModalOpen] = useState(false);
  const [pinRecoveryWords, setPinRecoveryWords] = useState<string[]>([]);
  const [pinVerifyIndices, setPinVerifyIndices] = useState<number[]>([]);
  const [pinVerifyInputs, setPinVerifyInputs] = useState<Record<number, string>>({});
  const [copiedPinWords, setCopiedPinWords] = useState(false);

  // Recovery Key Rotation State
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [rotationMsg, setRotationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<any | null>(null);

  // Wipe State
  const [isWiping, setIsWiping] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Add Account Modal State (Fix 21)
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'credit' | 'cash'>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(newAccBalance);
    if (!newAccName.trim() || isNaN(dollars) || dollars < 0) return;
    const cents = Math.round(dollars * 100);
    await addAccount(newAccName.trim(), newAccType, cents, newAccCurrency);
    setNewAccName('');
    setNewAccBalance('');
    setIsAddAccountOpen(false);
  };

  // Handle Change PIN Submit (Item 1: Generates new 12-word recovery key)
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMsg(null);

    if (oldPin.length < 4 || oldPin.length > 8) {
      setPinChangeMsg({ type: 'error', text: 'Current PIN must be 4 to 8 digits.' });
      return;
    }
    if (newPin.length < 4 || newPin.length > 8) {
      setPinChangeMsg({ type: 'error', text: 'New PIN must be 4 to 8 digits.' });
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinChangeMsg({ type: 'error', text: 'New PINs do not match.' });
      return;
    }

    // Verify old PIN before showing new recovery key
    setIsChangingPin(true);
    const meta = await getVaultMeta();
    if (!meta) {
      setIsChangingPin(false);
      setPinChangeMsg({ type: 'error', text: 'Vault metadata not found.' });
      return;
    }
    const testKey = await verifyPinAndDeriveKey(oldPin, meta.salt, meta.verifier, meta.verifierIv);
    setIsChangingPin(false);
    if (!testKey) {
      setPinChangeMsg({ type: 'error', text: 'Current PIN is incorrect.' });
      return;
    }

    // Old PIN is verified! Now generate NEW 12-word recovery key
    const words = generateRecoveryKey();
    const indices = selectVerificationIndices();
    setPinRecoveryWords(words);
    setPinVerifyIndices(indices);
    setPinVerifyInputs({});
    setCopiedPinWords(false);
    setIsPinRecoveryModalOpen(true);
  };

  const handleConfirmPinChangeWithKey = async () => {
    setIsChangingPin(true);
    const ok = await changePin(oldPin, newPin, pinRecoveryWords);
    setIsChangingPin(false);

    if (ok) {
      setIsPinRecoveryModalOpen(false);
      setPinChangeMsg({
        type: 'success',
        text: 'Master PIN changed successfully and new 12-word recovery key activated. Your old recovery key is now permanently invalidated.',
      });
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
      setPinRecoveryWords([]);
      setPinVerifyInputs({});
    } else {
      setPinChangeMsg({ type: 'error', text: 'PIN change failed during re-encryption.' });
    }
  };

  // Start Recovery Key Rotation
  const handleStartRotation = () => {
    const words = generateRecoveryKey();
    const indices = selectVerificationIndices();
    setNewWords(words);
    setVerifyIndices(indices);
    setVerifyInputs({});
    setRotationMsg(null);
    setIsRotatingKey(true);
  };

  const handleConfirmRotation = async () => {
    for (const idx of verifyIndices) {
      const expected = newWords[idx];
      const entered = (verifyInputs[idx] || '').trim().toLowerCase();
      if (entered !== expected) {
        setRotationMsg({ type: 'error', text: `Word #${idx + 1} does not match. Expected: ${expected}` });
        return;
      }
    }

    const ok = await rotateRecoveryKey(newWords);
    if (ok) {
      setRotationMsg({ type: 'success', text: 'Recovery key rotated successfully. Old key is now invalidated.' });
      setTimeout(() => {
        setIsRotatingKey(false);
        setNewWords([]);
      }, 2000);
    } else {
      setRotationMsg({ type: 'error', text: 'Failed to rotate recovery key.' });
    }
  };

  // Sync Export
  const handleExportSync = async () => {
    try {
      const json = await exportSyncBundle();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fundpilot_sync_${getLocalDate()}.fundpilot-sync`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus('Encrypted sync file exported. Move it to your other device to merge.');
    } catch (e: any) {
      setSyncStatus(`Export failed: ${e.message}`);
    }
  };

  // Sync Import
  const handleImportSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setSyncStatus('Merging sync bundle...');
        const res = await importSyncBundle(content);
        if (res.success && res.report) {
          setSyncReport(res.report);
          setSyncStatus(
            `Sync merge complete! ${res.report.addedCount} added, ${res.report.updatedCount} updated, ${res.report.tombstoneDeletedCount} deleted, ${res.report.skippedCount} skipped.`
          );
        } else {
          setSyncStatus(`Sync failed: ${res.error || 'Invalid sync bundle'}`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Full Backup Export / Import
  const handleExportBackup = async () => {
    try {
      const json = await exportEncryptedBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fundpilot_backup_${getLocalDate()}.fundpilot`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate encrypted backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const ok = await importEncryptedBackup(content);
        if (ok) {
          alert('Backup restored. Please unlock with your PIN.');
        } else {
          alert('Invalid backup file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  // CSV Export
  const handleExportCSV = () => {
    const { expensesCSV, fundsCSV, investmentsCSV, accountsCSV } = exportCSVData();
    const download = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    const dateStr = getLocalDate();
    download(expensesCSV, `fundpilot_expenses_${dateStr}.csv`);
    download(fundsCSV, `fundpilot_funds_${dateStr}.csv`);
    download(investmentsCSV, `fundpilot_investments_${dateStr}.csv`);
    download(accountsCSV, `fundpilot_accounts_${dateStr}.csv`);
  };

  // Wipe All Data
  const handleWipeConfirm = async () => {
    if (
      confirm(
        'CRITICAL ACTION: Are you sure you want to wipe all local data? This deletes all encrypted records, accounts, and investments. This cannot be undone.'
      )
    ) {
      setIsWiping(true);
      await wipeEverything();
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#f5f3ef]">Settings &amp; Vault Controls</h2>
        <p className="mt-1 text-xs text-[#9e9a93]">
          Unified control center for security, currency preferences, cross-device sync, and backup.
        </p>
      </div>

      {/* Section 1: Security & Master PIN (Fix 19 & Item 1) */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold text-[#f5f3ef]">Change Master PIN</h3>
        </div>
        <p className="text-xs text-[#9e9a93] mb-3">
          Re-encrypts all local records under your new cryptographic key. Your old PIN is verified first.
        </p>

        {/* Security Rule Statement */}
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong className="text-amber-400 font-semibold">Recovery Key Rule: </strong>
            Changing your PIN automatically generates a new 12-word recovery key. Your previous recovery key will stop working immediately upon confirmation. You must confirm the new 12 words before the PIN change takes effect.
          </div>
        </div>

        {pinChangeMsg && (
          <div
            className={`mb-4 rounded-xl p-3 text-xs flex items-center gap-2 ${
              pinChangeMsg.type === 'success'
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {pinChangeMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{pinChangeMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-[#9e9a93]">Current PIN</label>
            <input
              type="password"
              maxLength={8}
              required
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#9e9a93]">New 6-Digit PIN</label>
            <input
              type="password"
              maxLength={8}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#9e9a93]">Confirm New PIN</label>
            <input
              type="password"
              maxLength={8}
              required
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isChangingPin || !oldPin || !newPin}
              className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isChangingPin ? 'Verifying PIN...' : 'Continue to Recovery Key Setup'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Vault Preferences */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md space-y-5">
        <h3 className="text-sm font-semibold text-[#f5f3ef]">Preferences</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Display Currency (Fix 24) */}
          <div className="rounded-xl border border-[#262930] bg-[#0b0d10]/70 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-gold-light" />
              <span className="text-xs font-semibold text-[#f5f3ef]">Display Currency</span>
            </div>
            <p className="text-[11px] text-[#9e9a93] mb-3">
              Controls dashboard and net worth totals conversion. Individual record amounts never change.
            </p>
            <select
              value={displayCurrency}
              onChange={(e) => updateSettings({ displayCurrency: e.target.value })}
              className="w-full rounded-xl border border-[#262930] bg-[#111419] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
            >
              {Object.keys(CURRENCY_REGISTRY).map((code) => (
                <option key={code} value={code}>
                  {code} — {CURRENCY_REGISTRY[code].name} ({CURRENCY_REGISTRY[code].symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Lock Timer */}
          <div className="rounded-xl border border-[#262930] bg-[#0b0d10]/70 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-gold-light" />
              <span className="text-xs font-semibold text-[#f5f3ef]">Auto-Lock Idle Timeout</span>
            </div>
            <p className="text-[11px] text-[#9e9a93] mb-3">
              Automatically locks vault after period of inactivity.
            </p>
            <select
              value={settings.autoLockMinutes}
              onChange={(e) => updateSettings({ autoLockMinutes: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-[#262930] bg-[#111419] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
            >
              <option value={1}>1 Minute</option>
              <option value={5}>5 Minutes (Default)</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
            </select>
          </div>

          {/* 2D vs 3D Preference */}
          <div className="rounded-xl border border-[#262930] bg-[#0b0d10]/70 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#f5f3ef]">Prefer 2D Dashboard</span>
              <p className="text-[11px] text-[#9e9a93] mt-0.5">Use Recharts view instead of 3D Canvas</p>
            </div>
            <input
              type="checkbox"
              checked={settings.prefer2D}
              onChange={(e) => updateSettings({ prefer2D: e.target.checked })}
              className="h-4 w-4 rounded accent-gold"
            />
          </div>

          {/* Reduced Motion Toggle */}
          <div className="rounded-xl border border-[#262930] bg-[#0b0d10]/70 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#f5f3ef]">Reduced Motion</span>
              <p className="text-[11px] text-[#9e9a93] mt-0.5">Disables 3D camera sweeps and orbital rotations</p>
            </div>
            <input
              type="checkbox"
              checked={settings.useReducedMotion}
              onChange={(e) => updateSettings({ useReducedMotion: e.target.checked })}
              className="h-4 w-4 rounded accent-gold"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Recovery Key Rotation (Fix 26) */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            <h3 className="text-sm font-semibold text-[#f5f3ef]">PIN Recovery Key</h3>
          </div>
          {!isRotatingKey && (
            <button
              onClick={handleStartRotation}
              className="rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-1.5 text-xs text-gold-light hover:border-gold hover:bg-[#171a21]"
            >
              Rotate Key
            </button>
          )}
        </div>
        <p className="text-xs text-[#9e9a93]">
          12-word local phrase. Losing both your master PIN and recovery key means permanent data loss by design.
        </p>

        {isRotatingKey && (
          <div className="mt-4 rounded-xl border border-gold/30 bg-[#0b0d10] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gold-light">New 12-Word Recovery Key</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newWords.join(' '));
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="flex items-center gap-1 text-[11px] text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy Words'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {newWords.map((word, idx) => (
                <div key={idx} className="rounded-lg border border-[#262930] bg-[#111419] p-2 text-center text-xs">
                  <span className="text-[10px] text-[#9e9a93] mr-1">{idx + 1}.</span>
                  <span className="font-mono text-[#f5f3ef] font-semibold">{word}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#1e222b] pt-3">
              <span className="text-xs font-semibold text-[#f5f3ef]">Verification: Enter the 3 required words</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {verifyIndices.map((wordIdx) => (
                  <div key={wordIdx}>
                    <label className="text-[10px] text-[#9e9a93]">Word #{wordIdx + 1}</label>
                    <input
                      type="text"
                      placeholder={`Word #${wordIdx + 1}`}
                      value={verifyInputs[wordIdx] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVerifyInputs((prev) => ({ ...prev, [wordIdx]: val }));
                      }}
                      className="mt-1 w-full rounded-lg border border-[#262930] bg-[#111419] px-2.5 py-1.5 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {rotationMsg && (
              <div
                className={`rounded-lg p-2.5 text-xs ${
                  rotationMsg.type === 'success' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {rotationMsg.text}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRotatingKey(false)}
                className="rounded-xl px-4 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRotation}
                className="rounded-xl bg-gold px-4 py-1.5 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
              >
                Confirm Rotation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Cross-Device Sync (Fix 25) */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold text-[#f5f3ef]">Cross-Device File Sync</h3>
        </div>
        <p className="text-xs text-[#9e9a93]">
          Move encrypted sync bundles between your own devices via AirDrop, Drive, or USB. Both devices must share the same master PIN.
        </p>

        {syncStatus && (
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-gold-light">
            {syncStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportSync}
            className="flex items-center gap-2 rounded-xl border border-[#262930] bg-[#0b0d10] px-4 py-2.5 text-xs font-medium text-[#f5f3ef] hover:border-gold hover:bg-[#171a21]"
          >
            <Download className="h-4 w-4 text-gold-light" />
            <span>Export Sync Bundle</span>
          </button>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#262930] bg-[#0b0d10] px-4 py-2.5 text-xs font-medium text-[#f5f3ef] hover:border-gold hover:bg-[#171a21]">
            <Upload className="h-4 w-4 text-gold-light" />
            <span>Import Sync Bundle</span>
            <input type="file" accept=".fundpilot-sync,.json" onChange={handleImportSync} className="hidden" />
          </label>
        </div>

        {syncReport && (
          <div className="mt-3 rounded-xl border border-[#262930] bg-[#0b0d10] p-4 text-xs space-y-2">
            <h4 className="font-semibold text-gold-light">Sync Conflict &amp; Merge Audit Report:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#9e9a93]">
              <div>Added: <strong className="text-emerald-400">{syncReport.addedCount}</strong></div>
              <div>Updated: <strong className="text-gold-light">{syncReport.updatedCount}</strong></div>
              <div>Tombstones: <strong className="text-rose-400">{syncReport.tombstoneDeletedCount}</strong></div>
              <div>Skipped: <strong className="text-[#f5f3ef]">{syncReport.skippedCount}</strong></div>
            </div>
            {syncReport.conflicts.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1 text-[#9e9a93] max-h-32 overflow-y-auto">
                <span className="font-semibold text-[#f5f3ef]">Resolved Conflicts:</span>
                {syncReport.conflicts.map((c: any, i: number) => (
                  <div key={i}>• {c.type} ({c.id}): {c.reason}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 5: Multi-Currency Accounts Management (Fix 21) */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gold" />
            <div>
              <h3 className="text-sm font-semibold text-[#f5f3ef]">Multi-Currency Accounts</h3>
              <p className="text-xs text-[#9e9a93]">
                Manage checking, cash, and credit accounts across native currencies.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gold/10 border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </button>
        </div>

        {/* Account List */}
        <div className="space-y-2">
          {accounts.map((acc) => {
            const conv = convertCurrency(acc.balanceCents, acc.currency, displayCurrency, rates);
            const convBal = conv ? conv.convertedAmount : acc.balanceCents;
            const rateUsed = rates[acc.currency] || 1;
            const asOf = fxRate?.asOfDate || 'unknown';

            return (
              <div
                key={acc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-[#262930] bg-[#0b0d10] p-3 text-xs gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#f5f3ef]">{acc.name}</span>
                    <span className="rounded bg-[#1e222b] px-1.5 py-0.5 text-[10px] text-gold-light uppercase font-mono">
                      {acc.type}
                    </span>
                    <span className="rounded bg-[#1e222b] px-1.5 py-0.5 text-[10px] text-[#9e9a93] font-mono">
                      {acc.currency}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9e9a93] mt-0.5">
                    Last edited: {acc.lastEditedDate}
                    {acc.currency !== displayCurrency && (
                      <span className="ml-2 text-gold-light/80">
                        • Stored Rate: 1 {displayCurrency} = {rateUsed.toFixed(2)} {acc.currency} (as of {asOf})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-[#f5f3ef]">
                      {formatMoney(acc.balanceCents, acc.currency)}
                    </div>
                    {acc.currency !== displayCurrency && (
                      <div className="text-[11px] text-[#9e9a93]">
                        ≈ {formatMoney(convBal, displayCurrency)} ({displayCurrency})
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm(`Delete account "${acc.name}"?`)) {
                        await deleteAccount(acc.id);
                      }
                    }}
                    className="rounded p-1 text-rose-400 hover:text-rose-300"
                    title="Delete Account"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Account Modal */}
        {isAddAccountOpen && (
          <form onSubmit={handleCreateAccount} className="rounded-xl border border-gold/30 bg-[#0b0d10] p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gold-light">Create New Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-[#9e9a93]">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, Chase Sapphire"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#262930] bg-[#111419] px-2.5 py-1.5 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#9e9a93]">Type</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-[#262930] bg-[#111419] px-2 py-1.5 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  <option value="bank">Bank / Checking</option>
                  <option value="credit">Credit Card</option>
                  <option value="cash">Cash Wallet</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#9e9a93]">Currency</label>
                <select
                  value={newAccCurrency}
                  onChange={(e) => setNewAccCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#262930] bg-[#111419] px-2 py-1.5 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                >
                  {Object.keys(CURRENCY_REGISTRY).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#9e9a93]">Current Balance</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#262930] bg-[#111419] px-2.5 py-1.5 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gold px-4 py-1.5 text-xs font-semibold text-[#0b0d10] hover:brightness-110"
              >
                Save Account
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section 6: Backup, Restore & CSV */}
      <div className="rounded-2xl border border-[#1e222b] bg-[#111419]/90 p-6 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-semibold text-[#f5f3ef]">Data Backup &amp; CSV Export</h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 rounded-xl border border-[#262930] bg-[#0b0d10] px-4 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold hover:bg-[#171a21]"
          >
            <Download className="h-4 w-4 text-gold-light" />
            <span>Encrypted Vault Backup</span>
          </button>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#262930] bg-[#0b0d10] px-4 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold hover:bg-[#171a21]">
            <Upload className="h-4 w-4 text-gold-light" />
            <span>Restore Backup</span>
            <input type="file" accept=".fundpilot,.json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-[#262930] bg-[#0b0d10] px-4 py-2 text-xs font-medium text-[#f5f3ef] hover:border-gold hover:bg-[#171a21]"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Export All CSVs</span>
          </button>
        </div>
      </div>

      {/* Section 6: Wipe Everything */}
      <div className="rounded-2xl border border-rose-500/20 bg-[#111419]/90 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-rose-400">Wipe Local Database</h3>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Permanently purges all IndexedDB records, encryption keys, and settings.
            </p>
          </div>
          <button
            onClick={handleWipeConfirm}
            disabled={isWiping}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isWiping ? 'Wiping...' : 'Wipe Vault'}</span>
          </button>
        </div>
      </div>

      {/* Change PIN New Recovery Key Confirmation Modal (Item 1) */}
      {isPinRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gold/40 bg-[#111419] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e222b] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gold" />
                <h3 className="text-sm font-semibold text-[#f5f3ef]">
                  Step 2: Confirm New 12-Word Recovery Key
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPinRecoveryModalOpen(false);
                  setPinRecoveryWords([]);
                }}
                className="text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Important Security Rule: Old Key Invalidation</span>
              </div>
              <p>
                Changing your PIN permanently invalidates your previous 12-word recovery key.
                Write down this <strong>new 12-word phrase</strong> below.
                Your PIN will NOT change until you verify 3 random words.
              </p>
            </div>

            {/* 12-Word Grid */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#1e222b] bg-[#0b0d10] p-3 text-xs font-mono">
              {pinRecoveryWords.map((word, idx) => (
                <div key={idx} className="flex items-center gap-1.5 rounded-lg bg-[#171a21] px-2 py-1.5 text-[#c8c4bc]">
                  <span className="text-[#9e9a93] select-none text-[10px] w-4">{idx + 1}.</span>
                  <span className="font-semibold text-gold-light">{word}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pinRecoveryWords.join(' '));
                  setCopiedPinWords(true);
                  setTimeout(() => setCopiedPinWords(false), 2000);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#262930] bg-[#171a21] px-3 py-1.5 text-xs text-[#c8c4bc] hover:border-gold/30 hover:text-gold"
              >
                {copiedPinWords ? <Check className="h-3.5 w-3.5 text-gain" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPinWords ? 'Copied to Clipboard' : 'Copy 12 Words'}</span>
              </button>
            </div>

            {/* 3-Word Verification */}
            <div className="space-y-2 border-t border-[#1e222b] pt-3">
              <label className="text-xs font-medium text-[#c8c4bc]">
                Verify 3 Words from your New Key:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {pinVerifyIndices.map((wordIdx) => (
                  <div key={wordIdx}>
                    <label className="text-[10px] text-[#9e9a93] block mb-1">
                      Word #{wordIdx + 1}
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={pinVerifyInputs[wordIdx] || ''}
                      onChange={(e) =>
                        setPinVerifyInputs({
                          ...pinVerifyInputs,
                          [wordIdx]: e.target.value.toLowerCase().trim(),
                        })
                      }
                      placeholder={`Word #${wordIdx + 1}`}
                      className="w-full rounded-lg border border-[#262930] bg-[#0b0d10] px-2.5 py-1.5 text-xs text-[#f5f3ef] font-mono focus:border-gold focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-[#1e222b] pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsPinRecoveryModalOpen(false);
                  setPinRecoveryWords([]);
                }}
                className="rounded-xl border border-[#262930] px-4 py-2 text-xs font-semibold text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Cancel (PIN Unchanged)
              </button>
              <button
                type="button"
                disabled={
                  isChangingPin ||
                  pinVerifyIndices.some(
                    (idx) => (pinVerifyInputs[idx] || '').trim() !== pinRecoveryWords[idx]
                  )
                }
                onClick={handleConfirmPinChangeWithKey}
                className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110 disabled:opacity-40 transition-all"
              >
                {isChangingPin ? 'Re-encrypting Vault...' : 'Confirm PIN Change & Activate Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
