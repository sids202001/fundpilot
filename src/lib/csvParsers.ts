// CSV Parsers for Bank Statements & Brokerage Accounts
// Automatically maps columns, strictly reports unparsed rows instead of guessing

import { Expense, Holding, TaxLot, CategoryRule } from './types';
import { categorizeMerchant } from './aiCategorizer';

export interface BankCSVResult {
  expenses: Omit<Expense, 'id' | 'createdAt'>[];
  unparsedRows: Array<{ rowNumber: number; rawText: string; reason: string }>;
  detectedFormat: 'Chase' | 'Bank of America' | 'American Express' | 'Generic CSV';
}

export interface BrokerCSVResult {
  holdings: Array<{
    ticker: string;
    shares: number;
    costPerShareCents: number;
    totalCostCents: number;
    date: string;
  }>;
  unparsedRows: Array<{ rowNumber: number; rawText: string; reason: string }>;
  detectedBroker: 'Robinhood' | 'Schwab' | 'Fidelity' | 'Generic Broker';
}

// Basic robust CSV line splitter that respects quoted commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

// Parse Bank Statement CSV
export function parseBankCSV(csvText: string, userRules: CategoryRule[] = []): BankCSVResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return {
      expenses: [],
      unparsedRows: [{ rowNumber: 1, rawText: csvText, reason: 'File contains no data rows' }],
      detectedFormat: 'Generic CSV',
    };
  }

  const header = parseCSVLine(lines[0].toLowerCase());
  let format: BankCSVResult['detectedFormat'] = 'Generic CSV';

  // Format detection
  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;

  if (header.includes('transaction date') && header.includes('post date')) {
    format = 'Chase';
    dateIdx = header.indexOf('transaction date');
    descIdx = header.indexOf('description');
    amountIdx = header.indexOf('amount');
  } else if (header.includes('running bal.')) {
    format = 'Bank of America';
    dateIdx = header.indexOf('date');
    descIdx = header.indexOf('description');
    amountIdx = header.indexOf('amount');
  } else if (header.includes('card member') || header.includes('date processed')) {
    format = 'American Express';
    dateIdx = header.indexOf('date');
    descIdx = header.indexOf('description');
    amountIdx = header.indexOf('amount');
  } else {
    // Dynamic column matching
    dateIdx = header.findIndex((h) => h.includes('date'));
    descIdx = header.findIndex((h) => h.includes('desc') || h.includes('merchant') || h.includes('payee') || h.includes('name'));
    amountIdx = header.findIndex((h) => h.includes('amount') || h.includes('total') || h.includes('debit'));
  }

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      expenses: [],
      unparsedRows: [{ rowNumber: 1, rawText: lines[0], reason: 'Missing required columns (Date, Description, Amount)' }],
      detectedFormat: format,
    };
  }

  const expenses: Omit<Expense, 'id' | 'createdAt'>[] = [];
  const unparsedRows: BankCSVResult['unparsedRows'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = parseCSVLine(rawLine);

    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: 'Insufficient column count' });
      continue;
    }

    const rawDate = cols[dateIdx];
    const rawDesc = cols[descIdx];
    const rawAmt = cols[amountIdx].replace(/[$,\s]/g, '');

    // Validate date
    let dateStr = '';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) {
        unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Invalid date format: ${rawDate}` });
        continue;
      }
      dateStr = d.toISOString().split('T')[0];
    } catch (e) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Unparseable date: ${rawDate}` });
      continue;
    }

    // Validate amount
    const parsedNum = parseFloat(rawAmt);
    if (isNaN(parsedNum)) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Invalid numeric amount: ${rawAmt}` });
      continue;
    }

    // Expenses are typically negative or debit, normalize to positive expense amount in cents
    const absCents = Math.round(Math.abs(parsedNum) * 100);
    if (absCents === 0) continue; // Skip zero-dollar rows

    // Categorize
    const catResult = categorizeMerchant(rawDesc, userRules);

    expenses.push({
      amountCents: absCents,
      merchant: rawDesc,
      category: catResult.category,
      date: dateStr,
      source: 'csv',
      confidence: catResult.confidence,
    });
  }

  return {
    expenses,
    unparsedRows,
    detectedFormat: format,
  };
}

// Parse Brokerage CSV (Robinhood, Schwab, Fidelity)
export function parseBrokerCSV(csvText: string): BrokerCSVResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return {
      holdings: [],
      unparsedRows: [{ rowNumber: 1, rawText: csvText, reason: 'Empty file or header only' }],
      detectedBroker: 'Generic Broker',
    };
  }

  const header = parseCSVLine(lines[0].toLowerCase());
  let broker: BrokerCSVResult['detectedBroker'] = 'Generic Broker';

  let tickerIdx = -1;
  let sharesIdx = -1;
  let priceIdx = -1;
  let dateIdx = -1;

  if (header.includes('instrument') && header.includes('trans code')) {
    broker = 'Robinhood';
    tickerIdx = header.indexOf('instrument');
    sharesIdx = header.indexOf('quantity');
    priceIdx = header.indexOf('price');
    dateIdx = header.indexOf('activity date');
  } else if (header.includes('fees & comm')) {
    broker = 'Schwab';
    tickerIdx = header.indexOf('symbol');
    sharesIdx = header.indexOf('quantity');
    priceIdx = header.indexOf('price');
    dateIdx = header.indexOf('date');
  } else if (header.includes('run date') || header.includes('security description')) {
    broker = 'Fidelity';
    tickerIdx = header.indexOf('symbol');
    sharesIdx = header.indexOf('quantity');
    priceIdx = header.indexOf('price ($)') !== -1 ? header.indexOf('price ($)') : header.indexOf('price');
    dateIdx = header.indexOf('run date');
  } else {
    tickerIdx = header.findIndex((h) => h.includes('symbol') || h.includes('ticker') || h.includes('instrument'));
    sharesIdx = header.findIndex((h) => h.includes('qty') || h.includes('quantity') || h.includes('shares'));
    priceIdx = header.findIndex((h) => h.includes('price') || h.includes('cost'));
    dateIdx = header.findIndex((h) => h.includes('date'));
  }

  if (tickerIdx === -1 || sharesIdx === -1 || priceIdx === -1) {
    return {
      holdings: [],
      unparsedRows: [{ rowNumber: 1, rawText: lines[0], reason: 'Missing essential columns (Ticker/Symbol, Shares/Quantity, Price)' }],
      detectedBroker: broker,
    };
  }

  const holdings: BrokerCSVResult['holdings'] = [];
  const unparsedRows: BrokerCSVResult['unparsedRows'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = parseCSVLine(rawLine);

    if (cols.length <= Math.max(tickerIdx, sharesIdx, priceIdx)) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: 'Insufficient column count' });
      continue;
    }

    const rawTicker = cols[tickerIdx].toUpperCase().trim();
    const rawShares = parseFloat(cols[sharesIdx].replace(/[$,\s]/g, ''));
    const rawPrice = parseFloat(cols[priceIdx].replace(/[$,\s]/g, ''));

    if (!rawTicker || rawTicker.length < 1 || rawTicker.length > 10) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Invalid ticker symbol: ${rawTicker}` });
      continue;
    }

    if (isNaN(rawShares) || rawShares <= 0) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Invalid share count: ${cols[sharesIdx]}` });
      continue;
    }

    if (isNaN(rawPrice) || rawPrice <= 0) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Invalid price: ${cols[priceIdx]}` });
      continue;
    }

    let dateStr = new Date().toISOString().split('T')[0];
    if (dateIdx !== -1 && cols[dateIdx]) {
      try {
        const d = new Date(cols[dateIdx]);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      } catch (e) {
        // use today
      }
    }

    const costPerShareCents = Math.round(rawPrice * 100);
    const totalCostCents = Math.round(rawShares * costPerShareCents);

    holdings.push({
      ticker: rawTicker,
      shares: rawShares,
      costPerShareCents,
      totalCostCents,
      date: dateStr,
    });
  }

  return {
    holdings,
    unparsedRows,
    detectedBroker: broker,
  };
}
