// WebCrypto Cryptographic Engine — Final Architecture
// Zero-knowledge encryption at rest using AES-GCM 256-bit
// Master Key derived from user PIN using PBKDF2 (100,000 iterations of SHA-256)
// Recovery Key derived from 12-word mnemonic using PBKDF2 (100,000 iterations of SHA-256)
// PIN and Recovery Key are NEVER stored in persistent storage.

const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;
const VERIFIER_CONSTANT = 'FUNDPILOT_SECURE_VAULT_AUTHENTICATED_V1';
const RECOVERY_SALT_FIXED = 'FUNDPILOT_RECOVERY_KEY_SALT_STATIC_V1';

// Base64 helper utilities
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate random cryptographic salt (16 bytes)
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufferToBase64(salt);
}

// Generate random 12-byte initialization vector (IV) for AES-GCM
export function generateIv(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

// Derive AES-GCM 256-bit key from PIN and Salt via PBKDF2
export async function deriveKeyFromPin(pin: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const pinBuffer = enc.encode(pin);
  const saltBuffer = base64ToBuffer(saltBase64);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
    },
    true, // Extractable for recovery wrapping and backup export
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

// Derive AES-GCM 256-bit key from 12-word recovery key
export async function deriveKeyFromRecoveryWords(words: string[]): Promise<CryptoKey> {
  const normalized = words.map((w) => w.toLowerCase().trim()).join(' ');
  const enc = new TextEncoder();
  const phraseBuffer = enc.encode(normalized);
  const saltBuffer = enc.encode(RECOVERY_SALT_FIXED);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    phraseBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

// Wrap (encrypt) the vault's master CryptoKey using the recovery key
export async function wrapVaultKeyWithRecoveryWords(
  vaultKey: CryptoKey,
  recoveryWords: string[]
): Promise<{ wrappedKey: string; wrappedIv: string }> {
  const rawMasterBytes = await crypto.subtle.exportKey('raw', vaultKey);
  const recoveryKey = await deriveKeyFromRecoveryWords(recoveryWords);

  const iv = generateIv();
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    recoveryKey,
    rawMasterBytes
  );

  return {
    wrappedKey: bufferToBase64(cipherBuffer),
    wrappedIv: bufferToBase64(iv),
  };
}

// Unwrap (decrypt) the master CryptoKey using the recovery key
export async function unwrapVaultKeyWithRecoveryWords(
  wrappedKeyBase64: string,
  wrappedIvBase64: string,
  recoveryWords: string[]
): Promise<CryptoKey | null> {
  try {
    const recoveryKey = await deriveKeyFromRecoveryWords(recoveryWords);
    const cipherBytes = base64ToBuffer(wrappedKeyBase64);
    const ivBytes = base64ToBuffer(wrappedIvBase64);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as any,
      },
      recoveryKey,
      cipherBytes as any
    );

    // Import back as AES-GCM 256-bit CryptoKey
    const importedKey = await crypto.subtle.importKey(
      'raw',
      decryptedBuffer,
      {
        name: 'AES-GCM',
        length: AES_KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );

    return importedKey;
  } catch (err) {
    // Decryption failure indicates incorrect recovery key
    return null;
  }
}

// Encrypt any JSON-serializable object using AES-GCM
export async function encryptObject<T>(data: T, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(data);
  const plainBytes = enc.encode(jsonStr);

  const iv = generateIv();
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    plainBytes as any
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
}

// Decrypt ciphertext using AES-GCM
export async function decryptObject<T>(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<T> {
  const cipherBytes = base64ToBuffer(ciphertextBase64);
  const ivBytes = base64ToBuffer(ivBase64);

  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as any,
    },
    key,
    cipherBytes as any
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(plainBuffer);
  return JSON.parse(jsonStr) as T;
}

// Create initial vault verifier for a new PIN
export async function createVaultVerifier(key: CryptoKey): Promise<{ verifier: string; verifierIv: string }> {
  const enc = await encryptObject({ check: VERIFIER_CONSTANT, timestamp: Date.now() }, key);
  return {
    verifier: enc.ciphertext,
    verifierIv: enc.iv,
  };
}

// Verify entered PIN against stored verifier
export async function verifyPinAndDeriveKey(
  pin: string,
  saltBase64: string,
  verifierBase64: string,
  verifierIvBase64: string
): Promise<CryptoKey | null> {
  try {
    const key = await deriveKeyFromPin(pin, saltBase64);
    const decrypted = await decryptObject<{ check: string }>(verifierBase64, verifierIvBase64, key);
    if (decrypted && decrypted.check === VERIFIER_CONSTANT) {
      return key;
    }
    return null;
  } catch (err) {
    // Decryption failure indicates wrong PIN
    return null;
  }
}

// Device ID management for conflict resolution
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'node-device-01';
  let id = localStorage.getItem('fundpilot_device_id');
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('fundpilot_device_id', id);
  }
  return id;
}
