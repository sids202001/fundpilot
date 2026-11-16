// Client-side Receipt OCR Engine powered by Tesseract.js
// Runs 100% locally in user browser, zero network transmission.
// Includes strict mathematical reconciliation gate: Items + Tax === Total

import { getCurrencyDecimals, parseToSmallestUnit } from './currencies';

export interface ParsedReceiptItem {
  id?: string;
  name: string;
  amountCents: number; // Smallest integer unit in receipt currency
}

export interface ParsedReceipt {
  merchant: string;
  date: string; // YYYY-MM-DD local date
  currency: string;
  items: ParsedReceiptItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  confidence: number;
  rawText: string;
}

// Strict Reconciliation Gate Verification
export function verifyReceiptReconciliation(
  items: ParsedReceiptItem[],
  taxCents: number,
  totalCents: number
): {
  isReconciled: boolean;
  itemsSumCents: number;
  computedTotalCents: number;
  diffCents: number;
} {
  const itemsSumCents = items.reduce((sum, it) => sum + (it.amountCents || 0), 0);
  const computedTotalCents = itemsSumCents + (taxCents || 0);
  const diffCents = totalCents - computedTotalCents;
  return {
    isReconciled: diffCents === 0 && totalCents > 0,
    itemsSumCents,
    computedTotalCents,
    diffCents,
  };
}

// Parse text into structured receipt line items and totals
export function parseReceiptText(text: string, currencyCode: string = 'USD'): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedReceiptItem[] = [];
  let merchant = 'Unknown Store';

  // Use local date (Fix 15)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  let date = `${y}-${m}-${d}`;

  let totalCents = 0;
  let taxCents = 0;
  let subtotalCents = 0;

  // Infer merchant from first non-empty header line
  if (lines.length > 0) {
    const candidateMerchant = lines[0].replace(/[^\w\s&'-]/g, '').trim();
    if (candidateMerchant.length > 2) {
      merchant = candidateMerchant;
    }
  }

  // Regex helpers
  const priceRegex = /\$?(\d+[.,]\d{2,3}|\d+)/g;
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})/;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Look for Date
    if (!date || date === `${y}-${m}-${d}`) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        try {
          const parsedD = new Date(dateMatch[0]);
          if (!isNaN(parsedD.getTime())) {
            const py = parsedD.getFullYear();
            const pm = String(parsedD.getMonth() + 1).padStart(2, '0');
            const pd = String(parsedD.getDate()).padStart(2, '0');
            date = `${py}-${pm}-${pd}`;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Match prices in line
    const matches = Array.from(line.matchAll(priceRegex));
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const priceStr = lastMatch[1].replace(',', '.');
      const amountCents = parseToSmallestUnit(priceStr, currencyCode);

      if (
        lower.includes('grand total') ||
        lower.includes('total due') ||
        lower.includes('amount due') ||
        lower.includes('balance due') ||
        (lower.includes('total') && !lower.includes('subtotal') && !lower.includes('sub-total'))
      ) {
        totalCents = amountCents;
      } else if (lower.includes('subtotal') || lower.includes('sub-total')) {
        subtotalCents = amountCents;
      } else if (lower.includes('tax')) {
        taxCents = amountCents;
      } else {
        // Line item
        const itemName = line.substring(0, lastMatch.index).replace(/[^\w\s&'-]/g, '').trim();
        if (itemName.length > 1 && amountCents > 0) {
          items.push({
            id: `item-${items.length + 1}`,
            name: itemName,
            amountCents,
          });
        }
      }
    }
  }

  // Fallback: If totalCents wasn't explicitly labeled, sum of items + tax
  if (totalCents === 0 && items.length > 0) {
    const itemsSum = items.reduce((sum, item) => sum + item.amountCents, 0);
    totalCents = itemsSum + taxCents;
  }

  return {
    merchant,
    date,
    currency: currencyCode,
    items,
    subtotalCents: subtotalCents || (totalCents - taxCents),
    taxCents,
    totalCents,
    confidence: items.length > 0 && totalCents > 0 ? 0.95 : 0.80,
    rawText: text,
  };
}

// Run client-side Tesseract.js OCR on an image file or blob
export async function performReceiptOCR(
  imageSource: File | Blob | string,
  currencyCode: string = 'USD'
): Promise<ParsedReceipt> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  try {
    const ret = await worker.recognize(imageSource);
    const text = ret.data.text;
    await worker.terminate();
    return parseReceiptText(text, currencyCode);
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}
