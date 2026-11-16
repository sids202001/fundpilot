'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { generateRecoveryKey, selectVerificationIndices, validate12Words } from '@/lib/bip39';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
} from 'lucide-react';

export function LockScreen() {
  const { isSetup, setupPin, unlockVault, recoverVaultWithKey } = useStore();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Setup Step: 1 = PIN entry, 2 = Recovery words display, 3 = 3-word verification
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<{ [index: number]: string }>({});
  const [copiedWords, setCopiedWords] = useState(false);

  // Recovery Key Flow
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryText, setRecoveryText] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Initialize recovery words on setup
  useEffect(() => {
    if (!isSetup && recoveryWords.length === 0) {
      const words = generateRecoveryKey();
      setRecoveryWords(words);
      setVerifyIndices(selectVerificationIndices());
    }
  }, [isSetup, recoveryWords.length]);

  const handleDigit = (digit: string) => {
    setError(null);
    if (!isSetup) {
      if (!isConfirmingPin) {
        if (pin.length < 6) {
          const next = pin + digit;
          setPin(next);
          if (next.length === 6) {
            setIsConfirmingPin(true);
          }
        }
      } else {
        if (confirmPin.length < 6) {
          const next = confirmPin + digit;
          setConfirmPin(next);
        }
      }
    } else {
      if (pin.length < 6) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 6) {
          triggerUnlock(next);
        }
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    if (!isSetup) {
      if (isConfirmingPin) {
        if (confirmPin.length > 0) {
          setConfirmPin((prev) => prev.slice(0, -1));
        } else {
          setIsConfirmingPin(false);
          setPin('');
        }
      } else {
        setPin((prev) => prev.slice(0, -1));
      }
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const triggerUnlock = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const ok = await unlockVault(enteredPin);
      if (!ok) {
        setError('Incorrect PIN. Encryption key could not be verified.');
        setPin('');
      }
    } catch (e) {
      setError('Decryption failed.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmitToWords = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please re-enter.');
      setPin('');
      setConfirmPin('');
      setIsConfirmingPin(false);
      return;
    }
    setError(null);
    setSetupStep(2);
  };

  const handleProceedToVerify = () => {
    setSetupStep(3);
  };

  const handleFinalSetupSubmit = async () => {
    // Check 3 verification words
    for (const idx of verifyIndices) {
      const expected = recoveryWords[idx]?.toLowerCase();
      const entered = (verifyInputs[idx] || '').trim().toLowerCase();
      if (entered !== expected) {
        setError(`Word #${idx + 1} does not match. Please check your recovery key.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const ok = await setupPin(pin, recoveryWords);
      if (!ok) {
        setError('Failed to initialize cryptographic vault.');
      }
    } catch (e) {
      setError('Cryptographic setup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery Key submit
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    const words = recoveryText.trim().toLowerCase().split(/\s+/);
    if (words.length !== 12 || !validate12Words(words)) {
      setRecoveryError('Please enter exactly 12 valid BIP-39 recovery words.');
      return;
    }

    if (recoveryNewPin.length < 4) {
      setRecoveryError('New PIN must be at least 4 digits.');
      return;
    }

    if (recoveryNewPin !== recoveryConfirmPin) {
      setRecoveryError('PINs do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await recoverVaultWithKey(words, recoveryNewPin);
      if (ok) {
        setIsRecoveryModalOpen(false);
      } else {
        setRecoveryError('Recovery failed. Words could not unwrap the master encryption key.');
      }
    } catch (err) {
      setRecoveryError('Cryptographic recovery error.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryWords.join(' '));
    setCopiedWords(true);
    setTimeout(() => setCopiedWords(false), 2000);
  };

  const currentDisplayPin = !isSetup && isConfirmingPin ? confirmPin : pin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10] p-4 font-sans text-[#f5f3ef]">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#e5c07b]/5 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419]/95 p-8 shadow-2xl backdrop-blur-xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 border border-gold/30 text-gold-light">
            {isSetup ? <Lock className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f3ef]">
            {isSetup
              ? 'Unlock FundPilot Vault'
              : setupStep === 1
              ? isConfirmingPin
                ? 'Confirm Master PIN'
                : 'Create Master PIN'
              : setupStep === 2
              ? 'Save Recovery Key'
              : 'Verify Recovery Key'}
          </h1>
          <p className="mt-1 text-xs text-[#9e9a93]">
            {isSetup
              ? 'Enter your PIN to decrypt local database with AES-GCM'
              : setupStep === 1
              ? isConfirmingPin
                ? 'Re-enter your 6-digit PIN to confirm'
                : 'Zero-knowledge encryption at rest. Keys never leave this device.'
              : setupStep === 2
              ? 'Write down these 12 words in order. This is your emergency PIN recovery key.'
              : 'Confirm 3 random words to ensure you saved your recovery key.'}
          </p>
        </div>

        {/* STEP 1: PIN ENTRY (OR NORMAL UNLOCK) */}
        {(isSetup || setupStep === 1) && (
          <>
            {/* PIN Dots Indicator */}
            <div className="mb-6 flex justify-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    idx < currentDisplayPin.length
                      ? 'border-gold-light bg-gold shadow-[0_0_12px_rgba(212,175,55,0.6)]'
                      : 'border-[#262930] bg-[#171a21]'
                  }`}
                />
              ))}
            </div>

            {/* Error notification */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDigit(digit)}
                  className="flex h-14 items-center justify-center rounded-xl border border-[#262930] bg-[#171a21]/70 text-xl font-semibold text-[#f5f3ef] transition-all hover:border-gold/40 hover:bg-[#1e222b] active:scale-95 disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (isConfirmingPin) {
                    setIsConfirmingPin(false);
                    setConfirmPin('');
                  } else {
                    setPin('');
                  }
                  setError(null);
                }}
                className="flex h-14 items-center justify-center rounded-xl border border-[#262930] bg-[#171a21]/30 text-xs font-medium text-[#9e9a93] hover:bg-[#1e222b]/50"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDigit('0')}
                className="flex h-14 items-center justify-center rounded-xl border border-[#262930] bg-[#171a21]/70 text-xl font-semibold text-[#f5f3ef] transition-all hover:border-gold/40 hover:bg-[#1e222b] active:scale-95 disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="flex h-14 items-center justify-center rounded-xl border border-[#262930] bg-[#171a21]/30 text-sm font-medium text-[#9e9a93] hover:bg-[#1e222b]/50"
              >
                ⌫
              </button>
            </div>

            {/* Setup: Proceed to Recovery Words button */}
            {!isSetup && isConfirmingPin && (
              <button
                type="button"
                disabled={isLoading || confirmPin.length < 4}
                onClick={handlePinSubmitToWords}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light py-3 text-sm font-semibold text-[#0b0d10] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:brightness-110 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Next: Generate Recovery Key
              </button>
            )}

            {/* Unlock Screen Recovery Entry Point (Fix 26) */}
            {isSetup && (
              <div className="mt-6 border-t border-[#262930]/60 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsRecoveryModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-gold-light hover:underline"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Forgot PIN? Use 12-Word Recovery Key</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* SETUP STEP 2: DISPLAY 12 RECOVERY WORDS */}
        {!isSetup && setupStep === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gold/30 bg-[#0b0d10] p-4">
              <div className="grid grid-cols-3 gap-2">
                {recoveryWords.map((word, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 rounded-lg border border-[#262930] bg-[#171a21] px-2 py-1.5 text-xs"
                  >
                    <span className="font-mono text-[#716c64] text-[10px] w-4">{idx + 1}.</span>
                    <span className="font-semibold text-gold-light">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 rounded-lg border border-[#262930] bg-[#171a21] px-3 py-1.5 text-xs text-[#f5f3ef] hover:border-gold/40"
              >
                {copiedWords ? <Check className="h-3.5 w-3.5 text-gain" /> : <Copy className="h-3.5 w-3.5 text-gold-light" />}
                <span>{copiedWords ? 'Copied to clipboard' : 'Copy All 12 Words'}</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-amber-300">
              ⚠️ Store these offline. If you forget your PIN, these words are the only way to recover your vault.
            </p>

            <button
              type="button"
              onClick={handleProceedToVerify}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light py-3 text-sm font-semibold text-[#0b0d10] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:brightness-110"
            >
              <span>I Have Saved the Words → Verify</span>
            </button>
          </div>
        )}

        {/* SETUP STEP 3: 3-WORD CONFIRMATION */}
        {!isSetup && setupStep === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-[#9e9a93]">
              Confirm the 3 words from your recovery phrase to finish setup:
            </p>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {verifyIndices.map((idx) => (
                <div key={idx}>
                  <label className="text-[11px] font-semibold text-gold-light">
                    Enter Word #{idx + 1}:
                  </label>
                  <input
                    type="text"
                    required
                    value={verifyInputs[idx] || ''}
                    onChange={(e) => {
                      setVerifyInputs({ ...verifyInputs, [idx]: e.target.value });
                      setError(null);
                    }}
                    placeholder={`e.g. ${recoveryWords[idx] ? 'correct word' : ''}`}
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSetupStep(2)}
                className="flex-1 rounded-xl border border-[#262930] bg-[#171a21] py-2.5 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
              >
                Back to Words
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleFinalSetupSubmit}
                className="flex-1 rounded-xl bg-gradient-to-r from-gold to-gold-light py-2.5 text-xs font-semibold text-[#0b0d10] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 disabled:opacity-50"
              >
                {isLoading ? 'Encrypting...' : 'Initialize Vault'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECOVERY KEY MODAL (Fix 26) */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d10]/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-[#262930] bg-[#111419] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-gold-light">
              <Key className="h-5 w-5" />
              <h3 className="text-base font-bold text-[#f5f3ef]">Recover Vault with 12 Words</h3>
            </div>
            <p className="mt-1 text-xs text-[#9e9a93]">
              Type your 12-word recovery key separated by spaces. If verified, set a new master PIN to re-encrypt and unlock your vault.
            </p>

            {recoveryError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[#9e9a93]">12-Word Recovery Key</label>
                <textarea
                  rows={3}
                  required
                  placeholder="apple banana cherry dog elephant fox grape horse igloo jaguar kangaroo lemon"
                  value={recoveryText}
                  onChange={(e) => setRecoveryText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] p-2.5 font-mono text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9e9a93]">New 6-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={recoveryNewPin}
                    onChange={(e) => setRecoveryNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9e9a93]">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={recoveryConfirmPin}
                    onChange={(e) => setRecoveryConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="mt-1 w-full rounded-xl border border-[#262930] bg-[#0b0d10] px-3 py-2 text-xs text-[#f5f3ef] focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecoveryModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#9e9a93] hover:text-[#f5f3ef]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-4 py-2 text-xs font-semibold text-[#0b0d10] hover:brightness-110 disabled:opacity-50"
                >
                  {isLoading ? 'Recovering...' : 'Unwrap Key & Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
