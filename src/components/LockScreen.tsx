'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Lock, KeyRound, ShieldAlert, Fingerprint, CheckCircle2, AlertTriangle } from 'lucide-react';

export function LockScreen() {
  const { isSetup, setupPin, unlockVault } = useStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    setError(null);
    if (!isSetup) {
      if (!isConfirming) {
        if (pin.length < 6) {
          const next = pin + digit;
          setPin(next);
          if (next.length === 6) {
            setIsConfirming(true);
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
      if (isConfirming) {
        if (confirmPin.length > 0) {
          setConfirmPin((prev) => prev.slice(0, -1));
        } else {
          setIsConfirming(false);
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

  const handleSetupSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
      return;
    }

    setIsLoading(true);
    try {
      const success = await setupPin(pin);
      if (!success) {
        setError('Failed to initialize cryptographic vault.');
      }
    } catch (e) {
      setError('Cryptographic setup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!isSetup && isConfirming) {
        handleSetupSubmit();
      } else if (isSetup && pin.length >= 4) {
        triggerUnlock(pin);
      }
    }
  };

  const currentDisplayPin = !isSetup && isConfirming ? confirmPin : pin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            {isSetup ? <Lock className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isSetup ? 'Unlock FundPilot Vault' : isConfirming ? 'Confirm Your Master PIN' : 'Create Master PIN'}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {isSetup
              ? 'Enter your PIN to decrypt local database with AES-GCM'
              : isConfirming
              ? 'Re-enter your 6-digit master PIN to confirm'
              : 'Zero-knowledge encryption at rest. Keys are never transmitted.'}
          </p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="mb-6 flex justify-center gap-3">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                idx < currentDisplayPin.length
                  ? 'border-teal-400 bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]'
                  : 'border-slate-700 bg-slate-800/50'
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

        {/* Hidden input for physical keyboard entry */}
        <input
          type="password"
          maxLength={6}
          value={currentDisplayPin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            if (!isSetup) {
              if (isConfirming) {
                setConfirmPin(val);
                if (val.length === 6) {
                  // Will submit
                }
              } else {
                setPin(val);
                if (val.length === 6) {
                  setIsConfirming(true);
                }
              }
            } else {
              setPin(val);
              if (val.length === 6) {
                triggerUnlock(val);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          className="sr-only"
        />

        {/* Interactive Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(digit)}
              className="flex h-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/40 text-xl font-semibold text-slate-100 transition-all hover:border-slate-700 hover:bg-slate-800/80 active:scale-95 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (isConfirming) {
                setIsConfirming(false);
                setConfirmPin('');
              } else {
                setPin('');
              }
              setError(null);
            }}
            className="flex h-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/20 text-xs font-medium text-slate-400 hover:bg-slate-800/40"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="flex h-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/40 text-xl font-semibold text-slate-100 transition-all hover:border-slate-700 hover:bg-slate-800/80 active:scale-95 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="flex h-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/20 text-sm font-medium text-slate-400 hover:bg-slate-800/40"
          >
            ⌫
          </button>
        </div>

        {/* Setup Confirm Action */}
        {!isSetup && isConfirming && (
          <button
            type="button"
            disabled={isLoading || confirmPin.length < 4}
            onClick={handleSetupSubmit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-teal-400 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm & Initialize Vault
          </button>
        )}

        {/* Security Warning Guarantee */}
        <div className="mt-6 border-t border-slate-800/60 pt-4 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400/80" />
            <span>Wrong PIN = No access, no recovery path by design.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
