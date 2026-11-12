// Fundamental DCF Valuation Engine
// Ported faithfully from user's existing stock analyzer (dcf_engine.py)
// Rule 1: Valuation is never derived from spot price.
// Rule 2: Crypto assets (SOL, BTC) show N/A with clear reason.
// Rule 7: Circuit breaker trips if bear-case fair value exceeds spot by >50%.

import { getTickerConfig } from './tickerRegistry';

export interface DCFScenario {
  fairValue: number | null;
  fairValueStr: string;
  impliedReturnPct: number | null;
  impliedReturnStr: string;
  growth: number;
  growthStr: string;
  wacc: number;
  waccStr: string;
  terminalRate: number;
  terminalStr: string;
  description: string;
}

export interface DCFResult {
  ticker: string;
  isEquity: boolean;
  isApplicable: boolean;
  notApplicableReason?: string;
  baseFairValue: number | null;
  baseFairValueStr: string;
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  scenarios: {
    bear: DCFScenario;
    base: DCFScenario;
    bull: DCFScenario;
  } | null;
  inputsDisplay: string;
}

export function computeFundamentalDCF(ticker: string, spotPrice: number): DCFResult {
  const cleanTicker = ticker.toUpperCase().replace('-USD', '').trim();
  const config = getTickerConfig(cleanTicker);

  // Check if crypto or non-equity
  if (config?.assetType === 'crypto' || cleanTicker === 'BTC' || cleanTicker === 'SOL') {
    return {
      ticker: cleanTicker,
      isEquity: false,
      isApplicable: false,
      notApplicableReason: 'Crypto asset: No FCF/earnings for DCF valuation',
      baseFairValue: null,
      baseFairValueStr: 'N/A',
      circuitBreakerTripped: false,
      scenarios: null,
      inputsDisplay: 'Crypto (N/A)',
    };
  }

  if (!config || !config.sharesOutstanding || !config.ttmFcfUsd || config.ttmFcfUsd <= 0) {
    return {
      ticker: cleanTicker,
      isEquity: true,
      isApplicable: false,
      notApplicableReason: 'Insufficient audited FCF or registry data',
      baseFairValue: null,
      baseFairValueStr: 'N/A',
      circuitBreakerTripped: false,
      scenarios: null,
      inputsDisplay: 'N/A (unreliable input)',
    };
  }

  const fcf0 = config.ttmFcfUsd;
  const sh = config.sharesOutstanding;
  const isCyclical = config.isCyclical;
  const offBalanceCapex = config.jvCapexObligationUsd || 0;
  const netCash = (config.netCashUsd || 0) - offBalanceCapex;
  const rawGrowth = config.baseGrowth ?? 0.08;
  const beta = Math.max(0.60, Math.min(1.80, config.beta ?? 1.0));
  const years = 5;

  // 1. Cost of Capital (CAPM WACC)
  const rf = 0.042;
  const erp = 0.055;

  let g_base = 0.08;
  let g_bull = 0.12;
  let g_bear = 0.02;
  let g_term_base = 0.025;
  let g_term_bull = 0.030;
  let g_term_bear = 0.020;
  let wacc_base = 0.095;

  if (isCyclical) {
    // Memory / commodity cyclicals: mid-cycle normalization
    g_base = 0.060;
    g_bull = 0.100;
    g_bear = -0.020;
    g_term_base = 0.020;
    g_term_bull = 0.025;
    g_term_bear = 0.015;
    wacc_base = Math.max(0.090, Math.min(0.125, rf + beta * erp));
  } else if (rawGrowth > 0.25) {
    // Hyper-growth leaders compounding >25%
    const bg = Math.min(0.38, rawGrowth);
    g_base = bg;
    g_bull = Math.min(0.48, bg + 0.07);
    g_bear = Math.max(0.12, bg - 0.16);
    g_term_base = 0.030;
    g_term_bull = 0.035;
    g_term_bear = 0.020;

    let cashDiscount = 0.0;
    if (netCash > 0 && fcf0 > 0) {
      const cashCoverage = netCash / fcf0;
      cashDiscount = Math.min(0.010, cashCoverage * 0.005);
    }
    wacc_base = Math.max(0.080, Math.min(0.115, rf + beta * erp - cashDiscount));
  } else {
    // Mature growth
    const bg = Math.max(0.03, Math.min(0.25, rawGrowth));
    g_base = bg;
    g_bull = Math.min(0.32, bg + 0.05);
    g_bear = Math.max(-0.05, bg - 0.08);
    g_term_base = 0.025;
    g_term_bull = 0.030;
    g_term_bear = 0.020;
    wacc_base = Math.max(0.080, Math.min(0.125, rf + beta * erp));
  }

  const wacc_bull = Math.max(0.075, wacc_base - 0.010);
  const wacc_bear = wacc_base + 0.015;

  const scenarioConfigs: Array<{
    key: 'bear' | 'base' | 'bull';
    g: number;
    w: number;
    gt: number;
    desc: string;
  }> = [
    { key: 'bear', g: g_bear, w: wacc_bear, gt: g_term_bear, desc: 'Base cash flow growth reduced with conservative discount rate' },
    { key: 'base', g: g_base, w: wacc_base, gt: g_term_base, desc: 'Normalized FCF growth in line with sector average and cost of capital' },
    { key: 'bull', g: g_bull, w: wacc_bull, gt: g_term_bull, desc: 'Above-consensus top-line acceleration with expanded terminal multiple' },
  ];

  const scenarios: Record<'bear' | 'base' | 'bull', DCFScenario> = {} as any;

  for (const { key, g, w, gt, desc } of scenarioConfigs) {
    let pv_flows = 0.0;
    let cf_t = fcf0;
    for (let t = 1; t <= years; t++) {
      cf_t *= 1.0 + g;
      pv_flows += cf_t / Math.pow(1.0 + w, t);
    }

    const denom = Math.max(0.012, w - gt);
    const terminalVal = (cf_t * (1.0 + gt)) / denom;
    const pvTerminal = terminalVal / Math.pow(1.0 + w, years);

    const equityVal = pv_flows + pvTerminal + netCash;
    const fairVal = Math.max(1.0, Math.round((equityVal / sh) * 100) / 100);

    const impliedRet = spotPrice > 0 ? Math.round(((fairVal - spotPrice) / spotPrice) * 1000) / 10 : 0.0;

    scenarios[key] = {
      fairValue: fairVal,
      fairValueStr: `$${fairVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      impliedReturnPct: impliedRet,
      impliedReturnStr: `${impliedRet >= 0 ? '+' : ''}${impliedRet.toFixed(1)}%`,
      growth: g,
      growthStr: `${(g * 100).toFixed(1)}%`,
      wacc: w,
      waccStr: `${(w * 100).toFixed(1)}%`,
      terminalRate: gt,
      terminalStr: `${(gt * 100).toFixed(1)}%`,
      description: desc + (isCyclical ? ' [Mid-cycle normalized]' : ''),
    };
  }

  // Circuit Breaker Rule 7:
  // If bear fair value > spotPrice * 1.50, DCF model is halted
  let circuitBreakerTripped = false;
  let circuitBreakerReason: string | undefined;

  const bearFv = scenarios.bear.fairValue ?? 0;
  if (spotPrice > 0 && bearFv > spotPrice * 1.50) {
    circuitBreakerTripped = true;
    const spreadPct = (((bearFv - spotPrice) / spotPrice) * 100).toFixed(1);
    circuitBreakerReason = `DCF Circuit-Breaker Tripped: Bear fair value ($${bearFv.toFixed(2)}) exceeds spot ($${spotPrice.toFixed(2)}) by ${spreadPct}% (>50%). DCF model halted.`;

    for (const sc of ['bear', 'base', 'bull'] as const) {
      scenarios[sc].fairValue = null;
      scenarios[sc].fairValueStr = 'N/A (Halted — Circuit-Breaker)';
      scenarios[sc].impliedReturnPct = null;
      scenarios[sc].impliedReturnStr = 'N/A';
    }
  }

  const baseFv = scenarios.base.fairValue;
  const baseFvStr = scenarios.base.fairValueStr;

  return {
    ticker: cleanTicker,
    isEquity: true,
    isApplicable: true,
    baseFairValue: baseFv,
    baseFairValueStr: baseFvStr,
    circuitBreakerTripped,
    circuitBreakerReason,
    scenarios,
    inputsDisplay: `FCF: $${(fcf0 / 1e9).toFixed(2)}B | Growth: ${(g_base * 100).toFixed(1)}% | WACC: ${(wacc_base * 100).toFixed(1)}%`,
  };
}
