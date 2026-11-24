'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { RisingInk } from '@/components/3d-ui/RisingInk';
import { MagneticButton } from '@/components/3d-ui/MagneticButton';
import {
  Compass,
  PieChart,
  Wallet,
  PiggyBank,
  TrendingUp,
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
  const { lockVault, fxRate, isOffline, hideAmounts, toggleHideAmounts } = useStore();

  return (
    <header className="nav-3d sticky top-0 z-40 w-full">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#d4af37] via-[#e5c07b] to-[#b8860b] text-[#0b0d10] shadow-md shadow-[#d4af37]/20">
            <Compass className="h-5 w-5 font-bold" />
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-1.5">
              <RisingInk text="FundPilot" className="whitespace-nowrap font-bold tracking-tight text-[#f5f3ef]" />
              <span className="hidden 2xl:inline-block whitespace-nowrap rounded-full bg-[#d4af37]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#d4af37] border border-[#d4af37]/25">
                Local-First
              </span>
            </div>
            <p className="hidden 2xl:block whitespace-nowrap text-[10px] text-[#c2bdb4]">Zero-Tracking • AES-256 Encrypted</p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex shrink-0 items-center gap-1 rounded-xl border border-[#1e222b] bg-[#111419]/80 p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 lg:px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#c2bdb4] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <PieChart className="h-3.5 w-3.5 shrink-0" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 lg:px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'expenses'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#c2bdb4] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 lg:px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'funds'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#c2bdb4] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <PiggyBank className="h-3.5 w-3.5 shrink-0" />
            Sinking Funds
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 lg:px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'investments'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#c2bdb4] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            Investments
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 lg:px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-[#d4af37]/15 text-[#f3d99b] border border-[#d4af37]/35 shadow-sm'
                : 'text-[#c2bdb4] hover:text-[#f5f3ef] hover:bg-[#1a1d24]'
            }`}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            Settings
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* FX Pill (2xl+ only to keep 1440px header uncrowded) */}
          {fxRate && (
            <div className="hidden 2xl:flex items-center gap-1.5 rounded-lg border border-[#1e222b] bg-[#111419]/75 px-2.5 py-1 text-[11px] text-[#f5f3ef]">
              <Coins className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>$1 = ₹{fxRate.rate.toFixed(2)}</span>
              <span className="text-[10px] text-[#c2bdb4]">{fxRate.asOfDate ? `(${fxRate.asOfDate})` : '(cached)'}</span>
            </div>
          )}

          {/* Global Privacy Eye Toggle (Hide / Show All Money Amounts App-Wide) */}
          <button
            type="button"
            onClick={toggleHideAmounts}
            aria-label={hideAmounts ? 'Show all amounts' : 'Hide all amounts'}
            aria-pressed={hideAmounts}
            title={hideAmounts ? 'Show all amounts (Privacy Mode Active)' : 'Hide all amounts (Privacy Mode)'}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
              hideAmounts
                ? 'border-[#d4af37]/60 bg-[#d4af37]/20 text-[#f3d99b] shadow-sm'
                : 'border-[#262930] bg-[#111419]/85 text-[#f5f3ef] hover:border-[#d4af37]/40 hover:text-[#f3d99b]'
            }`}
          >
            {hideAmounts ? <EyeOff className="h-3.5 w-3.5 text-[#d4af37]" /> : <Eye className="h-3.5 w-3.5 text-[#d4af37]" />}
            <span className="hidden sm:inline">{hideAmounts ? 'Hidden' : 'Amounts'}</span>
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

          {/* Lock Vault (Navbar main action — MagneticButton) */}
          <MagneticButton
            type="button"
            onClick={lockVault}
            title="Lock Vault Now"
            className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </MagneticButton>
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
