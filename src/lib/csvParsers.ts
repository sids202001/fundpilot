// CSV Parsers for Bank Statements
// Automatically maps columns, strictly reports unparsed rows instead of guessing.
// Every imported row generates a dedupKey to prevent duplicate entries on re-import.
// Broker CSV import is deleted with the portfolio module.

import { Expense, CategoryRule } from './types';
import { categorizeMerchant } from './aiCategorizer';

export interface BankCSVResult {
  expenses: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[];
  unparsedRows: Array<{ rowNumber: number; rawText: string; reason: string }>;
  detectedFormat: 'Chase' | 'Bank of America' | 'American Express' | 'Generic CSV';
  newCount: number;
  duplicateCount: number;
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

// Format local date string from MM/DD/YYYY or YYYY-MM-DD
export function normalizeLocalDateString(dateInput: string): string {
  const clean = dateInput.trim();
  // Check MM/DD/YYYY
  const mdy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdy) {
    const m = mdy[1].padStart(2, '0');
    const d = mdy[2].padStart(2, '0');
    const y = mdy[3];
    return `${y}-${m}-${d}`;
  }
  // Check YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Fallback to local date parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return clean;
}

// Simple deterministic hash for dedupKey
export function computeDedupKey(date: string, merchant: string, amountCents: number, rowNum: number): string {
  const input = `${date}|${merchant.toLowerCase().trim()}|${amountCents}|${rowNum}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `dedup-${Math.abs(hash).toString(16)}-${rowNum}`;
}

// Parse Bank Statement CSV
export function parseBankCSV(
  csvText: string,
  userRules: CategoryRule[] = [],
  existingExpenses: Expense[] = [],
  accountId?: string,
  defaultCurrency: string = 'USD'
): BankCSVResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return {
      expenses: [],
      unparsedRows: [{ rowNumber: 1, rawText: csvText, reason: 'File contains no data rows' }],
      detectedFormat: 'Generic CSV',
      newCount: 0,
      duplicateCount: 0,
    };
  }

  const header = parseCSVLine(lines[0].toLowerCase());
  let format: BankCSVResult['detectedFormat'] = 'Generic CSV';

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
    dateIdx = header.findIndex((h) => h.includes('date'));
    descIdx = header.findIndex((h) => h.includes('desc') || h.includes('merchant') || h.includes('payee') || h.includes('name'));
    amountIdx = header.findIndex((h) => h.includes('amount') || h.includes('total') || h.includes('debit'));
  }

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      expenses: [],
      unparsedRows: [{ rowNumber: 1, rawText: lines[0], reason: 'Missing required columns (Date, Description, Amount)' }],
      detectedFormat: format,
      newCount: 0,
      duplicateCount: 0,
    };
  }

  // Build existing dedup set
  const existingDedupKeys = new Set<string>();
  const existingTriplets = new Set<string>();
  for (const exp of existingExpenses) {
    if (exp.dedupKey) existingDedupKeys.add(exp.dedupKey);
    // Also track date + merchant + amount triplet
    existingTriplets.add(`${exp.date}|${exp.merchant.toLowerCase().trim()}|${exp.amountCents}`);
  }

  const expenses: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const unparsedRows: BankCSVResult['unparsedRows'] = [];
  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = parseCSVLine(rawLine);

    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: 'Row has fewer columns than header' });
      continue;
    }

    const rawDate = cols[dateIdx];
    const rawDesc = cols[descIdx];
    const rawAmt = cols[amountIdx].replace(/[$,]/g, '').trim();

    if (!rawDate || !rawDesc || !rawAmt) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: 'Empty required field' });
      continue;
    }

    const normalizedDate = normalizeLocalDateString(rawDate);
    const num = parseFloat(rawAmt);
    if (isNaN(num)) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: `Invalid amount number: ${rawAmt}` });
      continue;
    }

    const absAmountCents = Math.round(Math.abs(num) * 100);
    if (absAmountCents === 0) {
      unparsedRows.push({ rowNumber: i + 1, rawText: rawLine, reason: 'Zero dollar amount' });
      continue;
    }

    // Money-in vs Money-out (entryType)
    // In credit card or bank statements, negative amounts typically denote debits (charges) while positive denote payments/credits
    // In some exports positive is charge, negative is refund
    // If format is Chase/BoA/Amex, negative is debit
    let entryType: 'debit' | 'credit' = num < 0 ? 'debit' : 'credit';
    if (format === 'American Express' && num > 0) {
      // Amex lists positive for charges
      entryType = 'debit';
    }

    const cleanMerchant = rawDesc.replace(/\s+/g, ' ').trim();
    const dedupKey = computeDedupKey(normalizedDate, cleanMerchant, absAmountCents, i);
    const triplet = `${normalizedDate}|${cleanMerchant.toLowerCase().trim()}|${absAmountCents}`;

    // Dedup check: Skip if already exists
    if (existingDedupKeys.has(dedupKey) || existingTriplets.has(triplet)) {
      duplicateCount++;
      continue;
    }

    // Classify category using deterministic rules
    const cat = categorizeMerchant(cleanMerchant, userRules);

    expenses.push({
      merchant: cleanMerchant,
      amountCents: absAmountCents,
      currency: defaultCurrency,
      category: cat.category,
      date: normalizedDate,
      source: 'csv',
      accountId,
      entryType,
      confidence: cat.confidence,
      dedupKey,
      notes: `Imported via ${format} statement (Row ${i + 1})`,
    });

    existingTriplets.add(triplet);
  }

  return {
    expenses,
    unparsedRows,
    detectedFormat: format,
    newCount: expenses.length,
    duplicateCount,
  };
}
