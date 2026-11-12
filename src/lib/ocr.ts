// Client-side Receipt OCR Engine powered by Tesseract.js
// 100% Free, runs entirely in the user's browser, zero data leaves the device

export interface ParsedReceiptItem {
  name: string;
  amountCents: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string;
  items: ParsedReceiptItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  confidence: number;
  rawText: string;
}

// Parse text into structured receipt line items and totals
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedReceiptItem[] = [];
  let merchant = 'Unknown Store';
  let date = new Date().toISOString().split('T')[0];
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
  const priceRegex = /\$?(\d+[.,]\d{2})/g;
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})/;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Look for Date
    if (!date || date === new Date().toISOString().split('T')[0]) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        try {
          const parsedD = new Date(dateMatch[0]);
          if (!isNaN(parsedD.getTime())) {
            date = parsedD.toISOString().split('T')[0];
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
      const amountCents = Math.round(parseFloat(priceStr) * 100);

      if (lower.includes('grand total') || lower.includes('total') || lower.includes('amount due') || lower.includes('balance due')) {
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
            name: itemName,
            amountCents,
          });
        }
      }
    }
  }

  // Fallback: If totalCents wasn't explicitly labeled, sum of items + tax, or maximum price found
  if (totalCents === 0) {
    if (items.length > 0) {
      const itemsSum = items.reduce((sum, item) => sum + item.amountCents, 0);
      totalCents = itemsSum + taxCents;
    }
  }

  return {
    merchant,
    date,
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
  onProgress?: (progress: number) => void
): Promise<ParsedReceipt> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  try {
    const ret = await worker.recognize(imageSource);
    const text = ret.data.text;
    await worker.terminate();
    return parseReceiptText(text);
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}
