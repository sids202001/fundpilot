'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import {
  Compass,
  PieChart,
  Wallet,
  PiggyBank,
  TrendingUp,
  Box,
  Layers,
  Lock,
  Wifi,
  WifiOff,
  Settings,
  Coins,
  Eye,
  EyeOff,
} from 'lucide-react';

export type AppNavTab = 'dashboard' | 'expenses' | 'funds' | 'investments' | 'settings';

interface NavbarProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  openSettingsModal?: () => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { lockVault, settings, updateSettings, fxRate, isOffline, hideAmounts, toggleHideAmounts } = useStore();

  const toggle2D = () => {
    updateSettings({ prefer2D: !settings.prefer2D });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1e222b] bg-[#0e1014]/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#d4af37] via-[#e5c07b] to-[#b8860b] text-[#0b0d10] shadow-md shadow-[#d4af37]/20">
            <Compass className="h-5 w-5 font-bold" />
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap font-bold tracking-tight text-[#f5f3ef]">FundPilot</span>
              <span className="hidden xl:inline-block whitespace-nowrap rounded-full bg-[#d4af37]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#d4af37] border border-[#d4af37]/25">
                Local-First
              </span>
            </div>
            <p className="hidden xl:block whitespace-nowrap text-[10px] text-[#9e9a93]">Zero-Tracking • AES-256 Encrypted</p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex shrink-0 items-center gap-1 rounded-xl border border-[#1e222b] bg-[#111419]/75 p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <PieChart className="h-4 w-4 shrink-0" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'expenses'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'funds'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <PiggyBank className="h-4 w-4 shrink-0" />
            Sinking Funds
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'investments'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            Investments
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* FX Pill */}
          {fxRate && (
            <div className="hidden 2xl:flex items-center gap-1.5 rounded-lg border border-[#1e222b] bg-[#111419]/75 px-2.5 py-1 text-[11px] text-[#f5f3ef]">
              <Coins className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>$1 = ₹{fxRate.rate.toFixed(2)}</span>
              <span className="text-[9px] text-[#9e9a93]">{fxRate.asOfDate ? `(${fxRate.asOfDate})` : '(date unknown)'}</span>
            </div>
          )}

          {/* Global Privacy Eye Toggle (Hide / Show All Money Amounts App-Wide) */}
          <button
            type="button"
            onClick={toggleHideAmounts}
            aria-label={hideAmounts ? 'Show all amounts' : 'Hide all amounts'}
            aria-pressed={hideAmounts}
            title={hideAmounts ? 'Show all amounts (Privacy Mode Active)' : 'Hide all amounts (Privacy Mode)'}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-medium transition-all ${
              hideAmounts
                ? 'border-[#d4af37]/60 bg-[#d4af37]/20 text-[#f3d99b] shadow-sm'
                : 'border-[#262930] bg-[#111419]/85 text-[#f5f3ef] hover:border-[#d4af37]/40 hover:text-[#f3d99b]'
            }`}
          >
            {hideAmounts ? <EyeOff className="h-3.5 w-3.5 text-[#d4af37]" /> : <Eye className="h-3.5 w-3.5 text-[#d4af37]" />}
            <span className="hidden xl:inline">{hideAmounts ? 'Hidden' : 'Amounts'}</span>
          </button>

          {/* 3D / 2D Toggle */}
          <button
            onClick={toggle2D}
            title={settings.prefer2D ? 'Switch to 3D Scene' : 'Switch to 2D Charts'}
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-xs font-medium transition-all ${
              settings.prefer2D
                ? 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f3d99b]'
                : 'border-[#d4af37]/40 bg-[#d4af37]/20 text-[#f5f3ef]'
            }`}
          >
            {settings.prefer2D ? <Layers className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5 text-[#d4af37]" />}
            <span className="hidden sm:inline">{settings.prefer2D ? '2D View' : '3D Scene'}</span>
          </button>

          {/* Offline / Online Pill */}
          <div
            title={isOffline ? 'Offline Mode (Local Cache Active)' : 'Online Mode'}
            className={`flex items-center rounded-lg border p-1.5 text-xs ${
              isOffline
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          </div>

          {/* Settings Tab Shortcut */}
          <button
            onClick={() => setActiveTab('settings')}
            title="Settings & Backup"
            className="flex items-center rounded-lg border border-[#1e222b] bg-[#111419]/75 p-1.5 text-[#9e9a93] hover:border-[#d4af37]/40 hover:text-white transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* Lock Vault */}
          <button
            onClick={lockVault}
            title="Lock Vault Now"
            className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden border-t border-[#1e222b] px-2 py-1 justify-around bg-[#0e1014]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'dashboard' ? 'text-[#d4af37]' : 'text-[#9e9a93]'
          }`}
        >
          <PieChart className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'expenses' ? 'text-[#d4af37]' : 'text-[#9e9a93]'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('funds')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'funds' ? 'text-[#d4af37]' : 'text-[#9e9a93]'
          }`}
        >
          <PiggyBank className="h-4 w-4" />
          Funds
        </button>
        <button
          onClick={() => setActiveTab('investments')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'investments' ? 'text-[#d4af37]' : 'text-[#9e9a93]'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Investments
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'settings' ? 'text-[#d4af37]' : 'text-[#9e9a93]'
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </header>
  );
}
