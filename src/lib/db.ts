// Dexie.js Local-First Database Layer
// All user financial records are encrypted with AES-GCM before storage.
// Raw records in IndexedDB contain ONLY ciphertext and random IVs.
// No plaintext amounts, balances, or merchants exist in persistent storage.

import Dexie, { Table } from 'dexie';
import { VaultRecord, QuoteData, FxRateData, EncryptedVaultMeta } from './types';

export interface MetaRecord {
  key: string;
  value: any;
}

export class FundPilotDB extends Dexie {
  meta!: Table<MetaRecord, string>;
  records!: Table<VaultRecord, string>;
  quotesCache!: Table<QuoteData, string>;
  fxCache!: Table<FxRateData, string>;

  constructor() {
    super('fundpilot_vault');
    this.version(1).stores({
      meta: '&key',
      records: '&id, type, updatedAt',
      quotesCache: '&ticker, timestamp',
      fxCache: '&pair, timestamp',
    });
  }
}

export const db = new FundPilotDB();

// Vault metadata operations
export async function getVaultMeta(): Promise<EncryptedVaultMeta | null> {
  const meta = await db.meta.get('vault_meta');
  return meta ? (meta.value as EncryptedVaultMeta) : null;
}

export async function saveVaultMeta(meta: EncryptedVaultMeta): Promise<void> {
  await db.meta.put({ key: 'vault_meta', value: meta });
}

// Complete wipe of all local records
export async function wipeAllData(): Promise<void> {
  await db.records.clear();
  await db.quotesCache.clear();
  await db.fxCache.clear();
  await db.meta.clear();
}
