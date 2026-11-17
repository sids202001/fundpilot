// FX Exchange Rate API Route
// Fetches free real exchange rates for 160+ currencies with real as-of dates.
// Privacy-preserving: transmits zero personal or financial data.
// On network failure: returns NO fallback rate. Never stamps today's date on a fake fallback rate.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // Cache 1 hour
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === 'object') {
        let asOfDate: string | null = null;
        if (data.time_last_update_utc) {
          const parsed = new Date(data.time_last_update_utc);
          if (!isNaN(parsed.getTime())) {
            asOfDate = parsed.toISOString().split('T')[0];
          }
        }

        return NextResponse.json({
          base: 'USD',
          rates: data.rates,
          asOfDate,
          timestamp: Date.now(),
          source: 'Open Exchange Rates (Public)',
        });
      }
    }
  } catch (err) {
    // Network error: do not fake a rate
  }

  // Strict honesty: Return failure so client relies on Dexie's cached rate with REAL date or displays N/A.
  return NextResponse.json(
    {
      error: 'FX rates unavailable',
      message: 'Network error or rate feed unreachable. Using verified local cached rates.',
    },
    { status: 503 }
  );
}
