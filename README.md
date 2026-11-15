# 🧭 FundPilot — Local-First Personal Finance Tracker

<p align="left">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14+-000000" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6" alt="TypeScript" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-000000" alt="Three.js" /></a>
  <img src="https://img.shields.io/badge/IndexedDB-Encrypted-FF6F61" alt="IndexedDB" />
  <img src="https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8" alt="PWA" />
</p>

Most personal finance apps ask for your bank login before they show you a single number, then keep your whole financial life on their servers. I built FundPilot to do the opposite: expenses, savings goals, and investments in one place, where every record stays on your own device, encrypted, with no bank connections, no accounts, and nothing to breach.

You add expenses four ways — type them, speak them, scan a receipt with the camera, or import a bank or broker CSV — and the app sorts them on your device, never sending your data anywhere. Money is kept in separate buckets — bank cash, credit card debt, savings funds, and investments — with money in and money out always shown separately, so the numbers always add up. The dashboard shows net worth as those four parts, plus safe-to-spend after bills and savings, in a 3D scene with a mascot called Aero, or as plain 2D charts with the exact same numbers. All money is stored as integer cents, so rounding errors can't creep in, and stock splits are handled by an engine that adjusts shares and cost basis while keeping your total exactly unchanged. It works in USD and INR, and every exchange rate shown carries its date. It tracks, it never values: no price targets, no advice, no predictions.

<p align="left">
  <img src="https://img.shields.io/badge/Local_First-No_Server_Database-success" alt="Local First" />
  <img src="https://img.shields.io/badge/Encryption-AES--GCM-blue" alt="Encryption" />
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
   │  Manual · Voice · Receipt photo · CSV import
   ▼
┌─────────────────────────────────────────────────────────┐
│  On-device processing                                     │
│  Tesseract.js OCR · Transformers.js categorization        │
│  (nothing leaves the device)                              │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Encrypted store — IndexedDB via Dexie.js                 │
│  AES-GCM (WebCrypto) · key from PIN via PBKDF2            │
│  PIN lock + optional biometric · auto-lock after 5 min    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Dashboard — 3D (React Three Fiber) or 2D (Recharts)      │
│  Net worth = cash + funds + portfolio − credit owed       │
│  Safe-to-spend = income − bills − allocations − spent     │
└────────────────────────────┬─────────────────────────────┘
   │  Only network calls: ticker symbols → quotes proxy,
   │  currency codes → FX rates. Nothing else.
```

## ▶️ Run it locally

```bash
cd fundpilot
npm install
npm run dev
```

Open http://localhost:3000, set a 6-digit Master PIN, and add your first expense. Your PIN is never stored — if you forget it, there is no recovery, by design.
