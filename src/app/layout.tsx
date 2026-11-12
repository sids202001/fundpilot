import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'FundPilot — 3D Local-First Personal Finance Tracker',
  description: 'Encrypted, local-first 3D personal finance command deck: Expenses, Sinking Funds & Portfolio Manager.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FundPilot',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060911] text-slate-100 antialiased selection:bg-teal-500 selection:text-slate-950">
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
