'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { isWebGLAvailable } from '@/lib/webgl';
import { LockScreen } from '@/components/LockScreen';
import { Navbar, AppNavTab } from '@/components/Navbar';
import { NetWorthSummary } from '@/components/dashboard/NetWorthSummary';
import { FinanceScene } from '@/components/3d/FinanceScene';
import { Dashboard2D } from '@/components/2d/Dashboard2D';
import { ExpenseModule } from '@/components/expenses/ExpenseModule';
import { FundsModule } from '@/components/funds/FundsModule';
import { InvestmentsModule } from '@/components/investments/InvestmentsModule';
import { SettingsView } from '@/components/settings/SettingsView';

export default function Home() {
  const { isVaultReady, isLocked, settings } = useStore();
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean>(true);

  // Check hardware/browser WebGL capability on mount
  useEffect(() => {
    setIsWebGLSupported(isWebGLAvailable());
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }, []);

  // Selected drill-down states from 3D/2D clicks
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [drillFundId, setDrillFundId] = useState<string | null>(null);
  const [drillInvestmentId, setDrillInvestmentId] = useState<string | null>(null);

  if (!isVaultReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-xs text-[#9e9a93]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <span>Initializing secure local vault...</span>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return <LockScreen />;
  }

  const handleSelectCategory = (cat: string) => {
    setDrillCategory(cat);
    setActiveTab('expenses');
  };

  const handleSelectFund = (fundId: string) => {
    setDrillFundId(fundId);
    setActiveTab('funds');
  };

  const handleSelectInvestment = (id: string) => {
    setDrillInvestmentId(id);
    setActiveTab('investments');
  };

  const handleSelectMonthFilter = (monthStr: string) => {
    setActiveTab('expenses');
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#f5f3ef] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Universal Financial Summary Headline (Shown on Dashboard) */}
        {activeTab === 'dashboard' && <NetWorthSummary />}

        {/* Tab 1: Dashboard (Unified 3D Scene or 2D Recharts) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {isWebGLSupported && !settings.prefer2D ? (
              <FinanceScene
                onSelectCategory={handleSelectCategory}
                onSelectFund={handleSelectFund}
                onSelectInvestment={handleSelectInvestment}
                onWebGLFailed={() => setIsWebGLSupported(false)}
              />
            ) : (
              <Dashboard2D
                onSelectCategory={handleSelectCategory}
                onSelectFund={handleSelectFund}
                onSelectInvestment={handleSelectInvestment}
                onSelectMonthFilter={handleSelectMonthFilter}
              />
            )}
          </div>
        )}

        {/* Tab 2: Expense Tracker */}
        {activeTab === 'expenses' && (
          <ExpenseModule filterCategory={drillCategory} />
        )}

        {/* Tab 3: Sinking Funds */}
        {activeTab === 'funds' && (
          <FundsModule selectedFundId={drillFundId} />
        )}

        {/* Tab 4: Manual Investments */}
        {activeTab === 'investments' && (
          <InvestmentsModule selectedId={drillInvestmentId} />
        )}

        {/* Tab 5: Settings & Sync */}
        {activeTab === 'settings' && (
          <SettingsView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e222b] bg-[#0b0d10]/90 py-4 text-center text-[11px] text-[#9e9a93]">
        FundPilot • 100% Local-First • AES-GCM Encrypted at Rest • Zero Telemetry
      </footer>
    </div>
  );
}
