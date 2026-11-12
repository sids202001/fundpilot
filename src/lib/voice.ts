// Browser-native Voice Entry using Web Speech API
// Extracts amount, merchant, and context from phrases like "spent $40 on groceries"

import { categorizeMerchant } from './aiCategorizer';
import { CategoryRule } from './types';

export interface VoiceParsedExpense {
  amountCents: number;
  merchant: string;
  category: string;
  confidence: number;
  transcript: string;
}

export function parseVoiceExpense(
  transcript: string,
  userRules: CategoryRule[] = []
): VoiceParsedExpense | null {
  const text = transcript.trim();
  if (!text) return null;

  // Regex patterns to capture amounts:
  // e.g. "$40", "$15.50", "40 dollars", "15 dollars and 50 cents", "40 bucks"
  let amountCents = 0;

  const dollarMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/i);
  const wordDollarMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)/i);
  const centsMatch = text.match(/and\s*(\d+)\s*cents/i);

  if (dollarMatch) {
    amountCents = Math.round(parseFloat(dollarMatch[1]) * 100);
  } else if (wordDollarMatch) {
    amountCents = Math.round(parseFloat(wordDollarMatch[1]) * 100);
    if (centsMatch) {
      amountCents += parseInt(centsMatch[1], 10);
    }
  } else {
    // Pure number heuristic: e.g. "spent 40 on lunch"
    const numMatch = text.match(/(?:spent|paid|for)\s+(\d+(?:\.\d{1,2})?)/i);
    if (numMatch) {
      amountCents = Math.round(parseFloat(numMatch[1]) * 100);
    }
  }

  // Extract merchant / description
  // Patterns like "at <merchant>", "for <merchant/item>", "on <merchant/item>"
  let merchant = 'General Expense';
  const atMatch = text.match(/at\s+([A-Za-z0-9\s'&]+?)(?:\s+(?:for|on|today|yesterday)|$)/i);
  const onMatch = text.match(/(?:on|for)\s+([A-Za-z0-9\s'&]+?)(?:\s+(?:at|today|yesterday)|$)/i);

  if (atMatch && atMatch[1].trim()) {
    merchant = atMatch[1].trim();
  } else if (onMatch && onMatch[1].trim()) {
    merchant = onMatch[1].trim();
  }

  // Capitalize merchant nicely
  merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);

  // Auto-categorize
  const catResult = categorizeMerchant(merchant, userRules);

  return {
    amountCents,
    merchant,
    category: catResult.category,
    confidence: catResult.confidence,
    transcript,
  };
}
