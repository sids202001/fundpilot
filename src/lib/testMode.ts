'use client';

/**
 * Local-only test mode (default OFF).
 * Activates ONLY when BOTH conditions hold:
 *   1. NEXT_PUBLIC_LOCAL_TEST_MODE === 'true' (from an uncommitted .env.local)
 *   2. Running strictly on localhost / 127.0.0.1 / ::1 in the browser
 * Never active in production or on any remote host.
 */
export function isLocalTestModeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOCAL_TEST_MODE !== 'true') {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

// Fixed base64-encoded 16-byte local-only salt used exclusively in localhost test mode.
// Never touches or overwrites a real vault's salt/verifier in vaultMeta.
export const LOCAL_TEST_MODE_SALT = 'RlBfVEVTVF9NT0RFXzAwMQ==';
