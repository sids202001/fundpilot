// On-Device AI Auto-Categorization Engine
// Zero network requests — 100% on-device
// High-confidence pattern classifier + global user category rules engine

import { CategoryRule } from './types';

export const STANDARD_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Housing & Rent',
  'Utilities',
  'Transportation & Fuel',
  'Shopping & Retail',
  'Health & Medical',
  'Entertainment & Streaming',
  'Travel',
  'Subscriptions',
  'Education',
  'Investment & Savings',
  'Miscellaneous',
];

interface KeywordMatcher {
  category: string;
  keywords: string[];
  confidence: number;
}

const CATEGORY_MATCHERS: KeywordMatcher[] = [
  {
    category: 'Groceries',
    keywords: ['trader joe', 'whole foods', 'kroger', 'safeway', 'aldi', 'costco', 'market', 'grocery', 'supermarket', 'wegmans', 'publix', 'sprouts', 'walmart'],
    confidence: 0.95,
  },
  {
    category: 'Food & Dining',
    keywords: ['starbucks', 'mcdonald', 'chipotle', 'restaurant', 'cafe', 'coffee', 'diner', 'pizza', 'burger', 'sushi', 'taco', 'bakery', 'doordash', 'ubereats', 'grubhub', 'shake shack', 'sweetgreen'],
    confidence: 0.92,
  },
  {
    category: 'Subscriptions',
    keywords: ['netflix', 'spotify', 'apple', 'google storage', 'disney', 'hulu', 'hbo', 'max', 'prime video', 'youtube', 'patreon', 'substack', 'chatgpt', 'openai', 'claude', 'github'],
    confidence: 0.96,
  },
  {
    category: 'Transportation & Fuel',
    keywords: ['uber', 'lyft', 'chevron', 'shell', 'exxon', 'bp', 'mobil', 'gas station', 'transit', 'metro', 'mta', 'bart', 'parking', 'toll', 'chargepoint', 'tesla supercharger'],
    confidence: 0.93,
  },
  {
    category: 'Utilities',
    keywords: ['coned', 'pge', 'electric', 'water', 'gas utility', 'internet', 'comcast', 'xfinity', 'verizon', 'at&t', 't-mobile', 'spectrum'],
    confidence: 0.94,
  },
  {
    category: 'Housing & Rent',
    keywords: ['rent', 'mortgage', 'lease', 'apartment', 'property management', 'hoa', 'landlord'],
    confidence: 0.95,
  },
  {
    category: 'Shopping & Retail',
    keywords: ['amazon', 'target', 'best buy', 'ikea', 'clothing', 'zara', 'nike', 'apple store', 'home depot', 'lowes', 'uniqlo'],
    confidence: 0.88,
  },
  {
    category: 'Health & Medical',
    keywords: ['cvs', 'walgreens', 'pharmacy', 'hospital', 'clinic', 'dental', 'doctor', 'optometry', 'labcorp', 'quest diagnostics'],
    confidence: 0.94,
  },
  {
    category: 'Travel',
    keywords: ['airline', 'delta', 'united', 'american air', 'southwest', 'hotel', 'marriott', 'hilton', 'airbnb', 'expedia', 'flight'],
    confidence: 0.92,
  },
  {
    category: 'Entertainment & Streaming',
    keywords: ['cinema', 'amc', 'regal', 'ticketmaster', 'concert', 'museum', 'bowling', 'arcade', 'steam', 'playstation', 'nintendo'],
    confidence: 0.90,
  },
];

export function categorizeMerchant(
  merchant: string,
  userRules: CategoryRule[] = []
): { category: string; confidence: number; source: 'rule' | 'ai' } {
  const normMerchant = merchant.toLowerCase().trim();

  // 1. Check User-defined Global Rules first (100% confidence)
  for (const rule of userRules) {
    if (normMerchant.includes(rule.merchantPattern.toLowerCase().trim())) {
      return {
        category: rule.category,
        confidence: 1.0,
        source: 'rule',
      };
    }
  }

  // 2. On-Device Keyword/Semantic Matcher
  for (const matcher of CATEGORY_MATCHERS) {
    for (const kw of matcher.keywords) {
      if (normMerchant.includes(kw)) {
        return {
          category: matcher.category,
          confidence: matcher.confidence,
          source: 'ai',
        };
      }
    }
  }

  // 3. Fallback
  return {
    category: 'Miscellaneous',
    confidence: 0.50,
    source: 'ai',
  };
}
