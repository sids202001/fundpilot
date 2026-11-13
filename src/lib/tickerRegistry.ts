// Authoritative Ticker Registry & Asset Profiles
// Maintains metadata for user's equity and crypto assets

export interface TickerConfig {
  ticker: string;
  name: string;
  assetType: 'equity' | 'crypto';
  sector: string;
  sharesOutstanding?: number;
  dividendPerQuarter?: number;
  nextExDate?: string;
  nextPayDate?: string;
}

export const TICKER_REGISTRY: Record<string, TickerConfig> = {
  NVDA: {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    assetType: 'equity',
    sector: 'Semiconductors',
    sharesOutstanding: 24_147_000_000,
    dividendPerQuarter: 0.01,
    nextExDate: '2026-12-05',
    nextPayDate: '2026-12-27',
  },
  MSFT: {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    assetType: 'equity',
    sector: 'Software & Cloud',
    sharesOutstanding: 7_426_194_552,
    dividendPerQuarter: 0.83,
    nextExDate: '2026-11-20',
    nextPayDate: '2026-12-10',
  },
  AMD: {
    ticker: 'AMD',
    name: 'Advanced Micro Devices, Inc.',
    assetType: 'equity',
    sector: 'Semiconductors',
    sharesOutstanding: 1_632_475_042,
  },
  SNDK: {
    ticker: 'SNDK',
    name: 'SanDisk Corporation',
    assetType: 'equity',
    sector: 'Memory & Storage',
    sharesOutstanding: 142_289_365,
  },
  MU: {
    ticker: 'MU',
    name: 'Micron Technology, Inc.',
    assetType: 'equity',
    sector: 'Semiconductors',
    sharesOutstanding: 1_131_423_212,
  },
  AVGO: {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    assetType: 'equity',
    sector: 'Semiconductors & Software',
    sharesOutstanding: 4_773_629_865,
  },
  GOOGL: {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    assetType: 'equity',
    sector: 'Interactive Media & Cloud',
    sharesOutstanding: 12_293_000_000,
  },
  GOOG: {
    ticker: 'GOOG',
    name: 'Alphabet Inc. (Class C)',
    assetType: 'equity',
    sector: 'Interactive Media & Cloud',
    sharesOutstanding: 12_293_000_000,
  },
  ORCL: {
    ticker: 'ORCL',
    name: 'Oracle Corporation',
    assetType: 'equity',
    sector: 'Enterprise Software & Cloud',
    sharesOutstanding: 3_031_501_149,
  },
  QCOM: {
    ticker: 'QCOM',
    name: 'QUALCOMM Incorporated',
    assetType: 'equity',
    sector: 'Semiconductors',
    sharesOutstanding: 1_067_839_507,
  },
  CRM: {
    ticker: 'CRM',
    name: 'Salesforce, Inc.',
    assetType: 'equity',
    sector: 'Cloud CRM',
    sharesOutstanding: 823_000_000,
  },
  NOW: {
    ticker: 'NOW',
    name: 'ServiceNow, Inc.',
    assetType: 'equity',
    sector: 'Enterprise Software',
    sharesOutstanding: 1_037_917_000,
  },
  NFLX: {
    ticker: 'NFLX',
    name: 'Netflix, Inc.',
    assetType: 'equity',
    sector: 'Streaming Entertainment',
    sharesOutstanding: 4_163_939_676,
  },
  META: {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    assetType: 'equity',
    sector: 'Social Media & AI',
    sharesOutstanding: 2_556_830_000,
  },
  INTC: {
    ticker: 'INTC',
    name: 'Intel Corporation',
    assetType: 'equity',
    sector: 'Semiconductors',
    sharesOutstanding: 5_315_000_000,
  },
  TEM: {
    ticker: 'TEM',
    name: 'Tempus AI, Inc.',
    assetType: 'equity',
    sector: 'Healthcare AI',
    sharesOutstanding: 177_198_230,
  },
  SOFI: {
    ticker: 'SOFI',
    name: 'SoFi Technologies, Inc.',
    assetType: 'equity',
    sector: 'Fintech & Digital Banking',
    sharesOutstanding: 1_296_617_325,
  },
  XYZ: {
    ticker: 'XYZ',
    name: 'XYZ Test Corporation',
    assetType: 'equity',
    sector: 'Test Fixture Asset',
    sharesOutstanding: 100_000_000,
  },
  SOL: {
    ticker: 'SOL',
    name: 'Solana',
    assetType: 'crypto',
    sector: 'Layer 1 Blockchain',
  },
  BTC: {
    ticker: 'BTC',
    name: 'Bitcoin',
    assetType: 'crypto',
    sector: 'Digital Currency & Store of Value',
  },
};

export function getTickerConfig(ticker: string): TickerConfig | undefined {
  const clean = ticker.toUpperCase().replace('-USD', '').trim();
  return TICKER_REGISTRY[clean];
}
