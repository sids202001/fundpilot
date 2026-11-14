import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Refined Champagne Gold Palette (Primary Accent)
        gold: {
          50: "#fdfbf7",
          100: "#f7f1e5",
          200: "#eddcb9",
          300: "#e2c58d",
          400: "#d4af37", // Primary Champagne Gold
          500: "#c29b28",
          600: "#a37e1c",
          700: "#7d5e16",
          800: "#5a4314",
          900: "#3d2d10",
          950: "#241908",
        },
        // Deep Warm Charcoal / Ink Palette (Background & Surfaces)
        charcoal: {
          950: "#0b0d10", // Canvas Background
          900: "#111419", // Deep Card Surface
          850: "#171a21", // Elevated Card Surface
          800: "#1e222b", // Card Hairline Border
          700: "#2c323f", // Hover Border Accent
          600: "#424a5a",
          500: "#606b7d",
          400: "#8a96a8", // Secondary Warm Text
          300: "#b5c0cf",
          200: "#dce3ec",
          100: "#f5f3ef", // Primary Warm Off-White Text
        },
        // Muted Gain / Loss Semantic Accents
        gain: {
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e", // Refined Emerald
          600: "#16a34a",
        },
        loss: {
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444", // Refined Terracotta Red
          600: "#dc2626",
        },
        // Aliased Pilot Palette to Gold for Systemic Consistency
        pilot: {
          50: "#fdfbf7",
          100: "#f7f1e5",
          200: "#eddcb9",
          300: "#e2c58d",
          400: "#d4af37",
          500: "#c29b28",
          600: "#a37e1c",
          700: "#7d5e16",
          800: "#5a4314",
          900: "#3d2d10",
          950: "#241908",
        },
      },
    },
  },
  plugins: [],
};
export default config;
