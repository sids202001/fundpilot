// FX Exchange Rate Proxy API Route
// Free exchange rates without requiring API keys
// Strictly privacy-preserving: receives only currency codes

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pair = searchParams.get('pair') || 'USD/INR';

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // Cache 1 hour
    });

    if (res.ok) {
      const data = await res.json();
      const inrRate = data?.rates?.INR || 84.45;
      const asOfDate = data?.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      return NextResponse.json({
        pair: 'USD/INR',
        rate: Math.round(inrRate * 100) / 100,
        asOfDate,
        timestamp: Date.now(),
        source: 'Open Exchange Rates (Public)',
      });
    }
  } catch (err) {
    // Network fallback
  }

  // Baseline fallback rate
  return NextResponse.json({
    pair: 'USD/INR',
    rate: 84.45,
    asOfDate: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    source: 'Fallback Baseline Reference',
  });
}
