// ISO 4217 Currency Registry & Per-Currency Decimals Engine
// All monetary amounts are stored as integers in their currency's smallest unit.
// Exponents:
// 0 decimals: JPY, KRW, VND, CLP, PYG, RWF, UGX, BIF, DJF, GNF, KMF, XOF, XAF, XPF
// 3 decimals: BHD, KWD, OMR, JOD, TND, IQD, LYD
// 2 decimals: USD, EUR, GBP, INR, CAD, AUD, CHF, SGD, AED, CNY, HKD, NZD, SEK, NOK, DKK, etc. (default)

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const CURRENCY_REGISTRY: Record<string, CurrencyMeta> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', decimals: 3 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', decimals: 3 },
  OMR: { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', decimals: 3 },
  JOD: { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', decimals: 3 },
  TND: { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT', decimals: 3 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2 },
  QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', decimals: 2 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', decimals: 2 },
  PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimals: 2 },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  ILS: { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', decimals: 2 },
  CLP: { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', decimals: 0 },
  COP: { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', decimals: 2 },
  TWD: { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', decimals: 2 },
};

export const SUPPORTED_CURRENCIES = Object.values(CURRENCY_REGISTRY);

// Zero-decimal currencies list
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'RWF', 'UGX', 'BIF', 'DJF', 'GNF', 'KMF', 'XOF', 'XAF', 'XPF'
]);

// Three-decimal currencies list
export const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'KWD', 'OMR', 'JOD', 'TND', 'IQD', 'LYD'
]);

// Get decimal exponent for any currency (default 2)
export function getCurrencyDecimals(currencyCode: string = 'USD'): number {
  const code = (currencyCode || 'USD').toUpperCase().trim();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

// Get currency symbol
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  const code = (currencyCode || 'USD').toUpperCase().trim();
  return CURRENCY_REGISTRY[code]?.symbol || code;
}

// Convert human float input (e.g. "10.50") to integer units (e.g. 1050)
export function parseToSmallestUnit(input: string | number, currencyCode: string = 'USD'): number {
  const decimals = getCurrencyDecimals(currencyCode);
  const factor = Math.pow(10, decimals);
  const val = typeof input === 'number' ? input : parseFloat(String(input).replace(/[^\d.-]/g, ''));
  if (isNaN(val)) return 0;
  return Math.round(val * factor);
}

// Convert integer units to float
export function fromSmallestUnit(units: number, currencyCode: string = 'USD'): number {
  const decimals = getCurrencyDecimals(currencyCode);
  const factor = Math.pow(10, decimals);
  return (units || 0) / factor;
}

// Format money for display according to its exact ISO 4217 decimals
// JPY: ¥5,000 (never .00)
// BHD: BD 10.500 (never loses 3rd decimal)
// USD: $10.50
export function formatMoney(units: number, currencyCode: string = 'USD'): string {
  const code = (currencyCode || 'USD').toUpperCase().trim();
  const decimals = getCurrencyDecimals(code);
  const symbol = getCurrencySymbol(code);
  const val = fromSmallestUnit(units, code);

  const formattedNum = val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbol}${decimals === 0 ? '' : ' '}${formattedNum}`;
}

// Currency conversion using stored FX rates (relative to USD base)
// All Open Exchange Rates are provided with USD as base (1 USD = rate * currency)
// To convert from currency A to currency B:
// val_in_USD = amount_in_A / rate_A
// val_in_B = val_in_USD * rate_B
export function convertCurrency(
  amountSmallestUnit: number,
  fromCurrency: string,
  toCurrency: string,
  fxRates: Record<string, number>
): { convertedAmount: number; rate: number; asOfDate?: string } | null {
  const fromCode = (fromCurrency || 'USD').toUpperCase().trim();
  const toCode = (toCurrency || 'USD').toUpperCase().trim();

  if (fromCode === toCode) {
    return { convertedAmount: amountSmallestUnit, rate: 1.0 };
  }

  // Rate of 1 USD in fromCurrency
  const fromRate = fromCode === 'USD' ? 1.0 : fxRates[fromCode];
  // Rate of 1 USD in toCurrency
  const toRate = toCode === 'USD' ? 1.0 : fxRates[toCode];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    return null; // Pair not covered
  }

  // 1 unit of fromCurrency in USD = 1 / fromRate
  // 1 unit of fromCurrency in toCurrency = (1 / fromRate) * toRate
  const effectiveRate = toRate / fromRate;

  // From float amount
  const fromFloat = fromSmallestUnit(amountSmallestUnit, fromCode);
  const toFloat = fromFloat * effectiveRate;
  const toUnits = parseToSmallestUnit(toFloat, toCode);

  return {
    convertedAmount: toUnits,
    rate: effectiveRate,
  };
}
