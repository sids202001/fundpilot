'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { LockScreen } from '@/components/LockScreen';
import { Navbar } from '@/components/Navbar';
import { NetWorthSummary } from '@/components/dashboard/NetWorthSummary';
import { FinanceScene } from '@/components/3d/FinanceScene';
import { Dashboard2D } from '@/components/2d/Dashboard2D';
import { ExpenseModule } from '@/components/expenses/ExpenseModule';
import { FundsModule } from '@/components/funds/FundsModule';
import { PortfolioModule } from '@/components/portfolio/PortfolioModule';
import { BackupModal } from '@/components/common/BackupModal';

export default function Home() {
  const { isVaultReady, isLocked, settings } = useStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'funds' | 'portfolio'>('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Selected drill-down states from 3D/2D clicks
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [drillFundId, setDrillFundId] = useState<string | null>(null);
  const [drillTicker, setDrillTicker] = useState<string | null>(null);

  if (!isVaultReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060911] text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
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

  const handleSelectHolding = (ticker: string) => {
    setDrillTicker(ticker);
    setActiveTab('portfolio');
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Universal Financial Summary Headline */}
        <NetWorthSummary />

        {/* Tab 1: Dashboard (Unified 3D Scene or 2D Recharts) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!settings.prefer2D ? (
              <FinanceScene
                onSelectCategory={handleSelectCategory}
                onSelectFund={handleSelectFund}
                onSelectHolding={handleSelectHolding}
              />
            ) : (
              <Dashboard2D
                onSelectCategory={handleSelectCategory}
                onSelectFund={handleSelectFund}
                onSelectHolding={handleSelectHolding}
              />
            )}
          </div>
        )}

        {/* Tab 2: Expense Tracker (Module A) */}
        {activeTab === 'expenses' && (
          <ExpenseModule filterCategory={drillCategory} />
        )}

        {/* Tab 3: Funds & Goals (Module B) */}
        {activeTab === 'funds' && (
          <FundsModule selectedFundId={drillFundId} />
        )}

        {/* Tab 4: Portfolio Manager (Module C) */}
        {activeTab === 'portfolio' && (
          <PortfolioModule selectedTicker={drillTicker} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-4 text-center text-[11px] text-slate-500">
        FundPilot • 100% Local-First • AES-GCM Encrypted at Rest • Zero Telemetry
      </footer>

      {/* Backup and Vault Settings Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
