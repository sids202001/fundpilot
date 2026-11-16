# 🧭 FundPilot — Local-First Personal Finance Tracker

<p align="left">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14+-000000" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6" alt="TypeScript" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-000000" alt="Three.js" /></a>
  <img src="https://img.shields.io/badge/IndexedDB-Encrypted-FF6F61" alt="IndexedDB" />
  <img src="https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8" alt="PWA" />
</p>

Most personal finance apps ask for your bank login before they show you a single number, then keep your whole financial life on their servers. I built FundPilot to do the opposite: expenses, sinking funds, and investments in one place, where every record stays on your own device, encrypted, with no bank connections, no accounts, and nothing to breach.

You add expenses four ways — type them, speak them, scan a receipt with the camera, or import a bank CSV statement — and the app sorts them on your device, never sending your data anywhere. Money is kept in separate buckets — bank cash, credit card debt, sinking funds, and investments — with money in and money out always shown separately, so the numbers always add up. Sinking fund deposits move money out of your bank account; withdrawals move money back. Investments are manual totals only: pick a type (Stocks, 401(k), Mutual Funds, ETFs, Crypto, Bonds, Other), type your balance, and update it whenever you check your accounts. The app tracks nothing about market prices or ticker history. The dashboard shows net worth as those four parts, plus safe-to-spend after bills and savings, in a 3D scene with a mascot called Aero, or as plain 2D charts with the exact same numbers. All money is stored as currency-aware integer units with zero floating-point drift, supporting 160+ ISO 4217 currencies including zero-decimal (JPY) and three-decimal (BHD) formats.

<p align="left">
  <img src="https://img.shields.io/badge/Local_First-No_Server_Database-success" alt="Local First" />
  <img src="https://img.shields.io/badge/Encryption-AES--GCM--256-blue" alt="Encryption" />
  <img src="https://img.shields.io/badge/Recovery-BIP--39_12--Word-gold" alt="BIP-39 Recovery" />
  <img src="https://img.shields.io/badge/Money_Math-Integer_Cents-blueviolet" alt="Money Math" />
  <img src="https://img.shields.io/badge/Receipt_OCR-On--Device-orange" alt="Receipt OCR" />
  <img src="https://img.shields.io/badge/Views-3D_+_2D-FF6F61" alt="Views" />
</p>

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│  FUNDPILOT — Next.js · TypeScript · Tailwind · PWA       │
└──────────────────────────────────────────────────────────┘
   │  Manual · Voice · Receipt photo · Bank CSV
   ▼
┌──────────────────────────────────────────────────────────┐
│  On-device Processing                                    │
│  Tesseract.js OCR (client-side) · Keyword rule learning  │
│  (100% on-device — nothing leaves your browser)          │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Encrypted Store — IndexedDB via Dexie.js                │
│  AES-GCM (256-bit WebCrypto) · key from PIN via PBKDF2   │
│  12-word BIP-39 recovery mnemonic for PIN reset          │
│  File-based cross-device sync with tombstone LWW         │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Dashboard — 3D (React Three Fiber) or 2D (Recharts)     │
│  Net worth = cash + funds + investments − credit owed    │
│  Safe-to-spend = income − bills − allocations − spent    │
└────────────────────────────┬─────────────────────────────┘
   │  Only network call: currency codes → Open Exchange Rates.
   │  Zero quote proxies, zero tracking telemetry.
```

## ▶️ Run it locally

```bash
cd fundpilot
npm install
npm run dev
```

Open `http://localhost:3000`, set your 6-digit Master PIN, and save your 12-word BIP-39 recovery mnemonic. Your PIN and keys are never transmitted over any network.
