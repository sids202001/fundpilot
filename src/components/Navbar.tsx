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
  Database,
  Moon,
  Coins,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'expenses' | 'funds' | 'portfolio';
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'funds' | 'portfolio') => void;
  openBackupModal: () => void;
}

export function Navbar({ activeTab, setActiveTab, openBackupModal }: NavbarProps) {
  const { lockVault, settings, updateSettings, fxRate, isOffline } = useStore();

  const toggle2D = () => {
    updateSettings({ prefer2D: !settings.prefer2D });
  };

  const toggleReducedMotion = () => {
    updateSettings({ useReducedMotion: !settings.useReducedMotion });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 shadow-md shadow-teal-500/20">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white">FundPilot</span>
              <span className="rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400 border border-teal-500/20">
                Local-First
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Zero-Tracking • AES-256 Encrypted</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <PieChart className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'expenses'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'funds'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <PiggyBank className="h-4 w-4" />
            Sinking Funds
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'portfolio'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Portfolio
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* FX Pill */}
          {fxRate && (
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-300">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>$1 = ₹{fxRate.rate.toFixed(2)}</span>
              <span className="text-[9px] text-slate-500">({fxRate.asOfDate})</span>
            </div>
          )}

          {/* 3D / 2D Toggle */}
          <button
            onClick={toggle2D}
            title={settings.prefer2D ? 'Switch to 3D Scene' : 'Switch to 2D Charts'}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              settings.prefer2D
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                : 'border-teal-500/40 bg-teal-500/15 text-teal-300'
            }`}
          >
            {settings.prefer2D ? <Layers className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
            <span>{settings.prefer2D ? '2D View' : '3D Scene'}</span>
          </button>

          {/* Offline / Online Pill */}
          <div
            title={isOffline ? 'Offline Mode (Local Cache Active)' : 'Online (Free Proxies Active)'}
            className={`flex items-center rounded-lg border p-1.5 text-xs ${
              isOffline
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          </div>

          {/* Backup & Storage */}
          <button
            onClick={openBackupModal}
            title="Encrypted Backup, CSV Export & Data Settings"
            className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <Database className="h-3.5 w-3.5" />
          </button>

          {/* Lock Vault */}
          <button
            onClick={lockVault}
            title="Lock Vault Now"
            className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden border-t border-slate-800/80 px-2 py-1 justify-around bg-slate-950">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'dashboard' ? 'text-teal-400' : 'text-slate-400'
          }`}
        >
          <PieChart className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'expenses' ? 'text-teal-400' : 'text-slate-400'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('funds')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'funds' ? 'text-teal-400' : 'text-slate-400'
          }`}
        >
          <PiggyBank className="h-4 w-4" />
          Funds
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
            activeTab === 'portfolio' ? 'text-teal-400' : 'text-slate-400'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Portfolio
        </button>
      </div>
    </header>
  );
}
