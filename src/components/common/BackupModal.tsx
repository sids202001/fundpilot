'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  ShieldAlert,
  X,
  CheckCircle2,
  Settings,
  AlertTriangle,
} from 'lucide-react';

export function BackupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    exportEncryptedBackup,
    importEncryptedBackup,
    exportCSVData,
    wipeEverything,
    settings,
    updateSettings,
  } = useStore();

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isWiping, setIsWiping] = useState(false);

  if (!isOpen) return null;

  // Handle Export Encrypted Backup
  const handleExportBackup = async () => {
    try {
      const json = await exportEncryptedBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fundpilot_encrypted_backup_${new Date().toISOString().split('T')[0]}.fundpilot`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate encrypted backup.');
    }
  };

  // Handle Import Encrypted Backup
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportStatus('Restoring backup...');
        const ok = await importEncryptedBackup(content);
        if (ok) {
          setImportStatus('Backup restored successfully! Please enter your PIN to unlock.');
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setImportStatus('Invalid backup file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle CSV Exports
  const handleExportCSV = () => {
    const { expensesCSV, fundsCSV, holdingsCSV } = exportCSVData();

    // Download combined or zip/individual
    const downloadBlob = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    const dateStr = new Date().toISOString().split('T')[0];
    downloadBlob(expensesCSV, `fundpilot_expenses_${dateStr}.csv`);
    downloadBlob(fundsCSV, `fundpilot_funds_${dateStr}.csv`);
    downloadBlob(holdingsCSV, `fundpilot_holdings_${dateStr}.csv`);
  };

  // Wipe All Data
  const handleWipeConfirm = async () => {
    if (confirm('CRITICAL ACTION: Are you sure you want to wipe all local data? This deletes all encrypted records, holdings, and expenses. This cannot be undone.')) {
      setIsWiping(true);
      await wipeEverything();
      setIsWiping(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="h-4 w-4 text-teal-400" />
          <span>Security, Backup & Vault Settings</span>
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          FundPilot is 100% local-first. All data resides solely in encrypted IndexedDB in this browser.
        </p>

        <div className="mt-6 space-y-4">
          {/* Section 1: Backup & Restore */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h4 className="text-xs font-semibold text-slate-200">Encrypted Backup & Restore</h4>
            <p className="mt-1 text-[11px] text-slate-400">
              One-click export of an encrypted backup file (.fundpilot). Useless without your PIN.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Encrypted Backup</span>
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white">
                <Upload className="h-3.5 w-3.5 text-teal-400" />
                <span>Import Backup File</span>
                <input
                  type="file"
                  accept=".fundpilot,.json"
                  onChange={handleFileSelect}
                  className="sr-only"
                />
              </label>
            </div>
            {importStatus && (
              <div className="mt-2 text-[11px] text-teal-300 font-medium">{importStatus}</div>
            )}
          </div>

          {/* Section 2: CSV Data Export */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h4 className="text-xs font-semibold text-slate-200">Plaintext CSV Export</h4>
            <p className="mt-1 text-[11px] text-slate-400">
              Download clean CSV spreadsheets of your transactions, sinking funds, and stock/crypto holdings.
            </p>
            <button
              onClick={handleExportCSV}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Download CSVs (Expenses, Funds, Holdings)</span>
            </button>
          </div>

          {/* Section 3: Cloud LLM Opt-in Warning */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Cloud LLM Opt-In</h4>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Default is 100% on-device AI. Remote LLM sends merchant queries off-device.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.cloudLlmOptIn}
                onChange={(e) => {
                  if (e.target.checked) {
                    const confirmLeave = confirm(
                      'PRIVACY NOTICE: Enabling Cloud LLM will transmit expense merchant strings to remote LLM servers. All other storage remains encrypted locally. Proceed?'
                    );
                    if (confirmLeave) {
                      updateSettings({ cloudLlmOptIn: true });
                    }
                  } else {
                    updateSettings({ cloudLlmOptIn: false });
                  }
                }}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500"
              />
            </div>
            {settings.cloudLlmOptIn && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>Notice: Cloud LLM enabled. Data leaves device only for explicit remote categorization queries.</span>
              </div>
            )}
          </div>

          {/* Section 4: Wipe Everything */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
            <h4 className="text-xs font-semibold text-rose-300">Delete Everything (Emergency Wipe)</h4>
            <p className="mt-1 text-[11px] text-rose-200/80">
              Permanently purges IndexedDB, clears all encryption keys, verifiers, transactions, funds, and holdings.
            </p>
            <button
              disabled={isWiping}
              onClick={handleWipeConfirm}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Wipe Local Store Completely</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
