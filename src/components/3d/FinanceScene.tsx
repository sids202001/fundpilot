'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';

// Center Net Worth Core
function NetWorthCore({ totalNetWorthCents, reducedMotion }: { totalNetWorthCents: number; reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!reducedMotion && meshRef.current && glowRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.2;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer subtle glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial color="#14b8a6" transparent opacity={0.12} wireframe />
      </mesh>
      {/* Core crystalline dodecahedron */}
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          color="#2dd4bf"
          roughness={0.15}
          metalness={0.85}
          emissive="#0d9488"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Net worth text label */}
      <Text
        position={[0, -1.35, 0]}
        fontSize={0.24}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        ${(totalNetWorthCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </Text>
      <Text
        position={[0, -1.62, 0]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Net Worth Core
      </Text>
    </group>
  );
}

// Sinking Funds Orbiting Rings
function FundOrbitRing({
  radius,
  progressRatio,
  name,
  savedDollars,
  targetDollars,
  currency,
  reducedMotion,
  onClick,
}: {
  radius: number;
  progressRatio: number;
  name: string;
  savedDollars: number;
  targetDollars: number;
  currency: string;
  reducedMotion: boolean;
  onClick: () => void;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (!reducedMotion && ringRef.current) {
      ringRef.current.rotation.z += delta * (0.15 / (radius * 0.4));
    }
  });

  // Calculate arc angle based on progress (up to 2 * PI)
  const arc = Math.max(0.1, Math.min(Math.PI * 2, Math.PI * 2 * progressRatio));

  return (
    <group
      ref={ringRef}
      rotation={[Math.PI / 2.3, 0, radius]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Background track */}
      <mesh>
        <ringGeometry args={[radius - 0.04, radius + 0.04, 64]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Progress filled arc */}
      <mesh>
        <ringGeometry args={[radius - 0.06, radius + 0.06, 64, 1, 0, arc]} />
        <meshBasicMaterial
          color={hovered ? '#5eead4' : '#0d9488'}
          transparent
          opacity={hovered ? 0.95 : 0.75}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Small orbiting satellite sphere */}
      <mesh position={[Math.cos(arc) * radius, Math.sin(arc) * radius, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// Spending Skyline Bar
function SkylineBar({
  position,
  category,
  spentCents,
  maxSpentCents,
  onClick,
}: {
  position: [number, number, number];
  category: string;
  spentCents: number;
  maxSpentCents: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const heightRatio = maxSpentCents > 0 ? spentCents / maxSpentCents : 0.1;
  const barHeight = Math.max(0.2, heightRatio * 2.2);

  return (
    <group
      position={[position[0], barHeight / 2, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[0.45, barHeight, 0.45]} />
        <meshStandardMaterial
          color={hovered ? '#fbbf24' : '#f59e0b'}
          roughness={0.3}
          metalness={0.4}
          emissive="#d97706"
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>
      <Text
        position={[0, barHeight / 2 + 0.18, 0]}
        fontSize={0.11}
        color={hovered ? '#ffffff' : '#cbd5e1'}
        anchorX="center"
        anchorY="bottom"
      >
        {category.substring(0, 8)}
      </Text>
    </group>
  );
}

// Portfolio Treemap 3D Block
function PortfolioBlock({
  position,
  ticker,
  marketValueDollars,
  gainLossPct,
  onClick,
}: {
  position: [number, number, number];
  ticker: string;
  marketValueDollars: number;
  gainLossPct: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Block size = position value
  const size = Math.max(0.5, Math.min(1.4, Math.sqrt(marketValueDollars / 2000) * 0.7));
  // Block height = magnitude of unrealized P&L %
  const pnlMagnitude = Math.abs(gainLossPct);
  const height = Math.max(0.25, Math.min(2.2, 0.35 + (pnlMagnitude / 25) * 1.0));

  const isGain = gainLossPct >= 0;
  const color = isGain ? (hovered ? '#4ade80' : '#10b981') : hovered ? '#f87171' : '#ef4444';

  return (
    <group
      position={[position[0], height / 2, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.5}
          emissive={isGain ? '#059669' : '#dc2626'}
          emissiveIntensity={hovered ? 0.6 : 0.25}
        />
      </mesh>
      <Text
        position={[0, height / 2 + 0.15, 0]}
        fontSize={0.13}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
      >
        {ticker}
      </Text>
    </group>
  );
}

export function FinanceScene({
  onSelectCategory,
  onSelectFund,
  onSelectHolding,
  onWebGLFailed,
}: {
  onSelectCategory: (cat: string) => void;
  onSelectFund: (fundId: string) => void;
  onSelectHolding: (ticker: string) => void;
  onWebGLFailed?: () => void;
}) {
  const { totalNetWorthCents, totalFundsCents, totalPortfolioCents, funds, expenses, holdings, quotes, settings } = useStore();
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  const isReducedMotion = useMemo(() => {
    if (settings.useReducedMotion) return true;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    return false;
  }, [settings.useReducedMotion]);

  // Category aggregates for Skyline
  const categorySpendMap = useMemo(() => {
    const map = new Map<string, number>();
    const currentMonth = new Date().toISOString().substring(0, 7);
    expenses
      .filter((e) => e.date.startsWith(currentMonth))
      .forEach((e) => {
        map.set(e.category, (map.get(e.category) || 0) + e.amountCents);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [expenses]);

  const maxCategorySpend = useMemo(() => {
    return Math.max(1, ...categorySpendMap.map((c) => c[1]));
  }, [categorySpendMap]);

  return (
    <div className="relative h-[540px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* 3D Scene Controls HUD */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/90 px-3.5 py-2 backdrop-blur-md shadow-lg">
          <span className="text-xs font-semibold text-teal-400">FundPilot 3D Command Deck</span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300">
            <span>Cash: ${(settings.bankCashCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span>•</span>
            <span>Funds: ${(totalFundsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span>•</span>
            <span>Port: ${(totalPortfolioCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            <span>•</span>
            <span className="text-rose-400">Credit: -${(settings.creditCardOwedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
          </div>
          <p className="mt-0.5 text-[9px] text-slate-400">Net Worth: ${(totalNetWorthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Cash + Funds + Port − Credit)</p>
        </div>
      </div>

      {/* Selected element banner */}
      {selectedInfo && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-teal-500/40 bg-slate-900/90 px-4 py-1.5 text-xs font-medium text-teal-300 shadow-xl backdrop-blur-md">
          {selectedInfo}
        </div>
      )}

      {/* R3F Canvas */}
      <Canvas
        camera={{ position: [0, 5, 8], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => setSelectedInfo(null)}
      >
        <color attach="background" args={['#060911']} />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#0d9488" />

        {/* Central Net Worth Core */}
        <NetWorthCore
          totalNetWorthCents={totalNetWorthCents}
          reducedMotion={isReducedMotion}
        />

        {/* Orbiting Sinking Funds */}
        {funds.map((fund, idx) => {
          const ratio = fund.targetAmountCents > 0 ? fund.currentAmountCents / fund.targetAmountCents : 0;
          const radius = 2.0 + idx * 0.75;
          return (
            <FundOrbitRing
              key={fund.id}
              radius={radius}
              progressRatio={ratio}
              name={fund.name}
              savedDollars={fund.currentAmountCents / 100}
              targetDollars={fund.targetAmountCents / 100}
              currency={fund.currency}
              reducedMotion={isReducedMotion}
              onClick={() => {
                setSelectedInfo(`Fund: ${fund.name} — $${(fund.currentAmountCents / 100).toFixed(0)} of $${(fund.targetAmountCents / 100).toFixed(0)} (${(ratio * 100).toFixed(0)}%)`);
                onSelectFund(fund.id);
              }}
            />
          );
        })}

        {/* Spending Skyline (South Quadrant) */}
        {categorySpendMap.map(([cat, cents], idx) => {
          const xPos = -2.2 + idx * 0.85;
          const zPos = 3.2;
          return (
            <SkylineBar
              key={cat}
              position={[xPos, 0, zPos]}
              category={cat}
              spentCents={cents}
              maxSpentCents={maxCategorySpend}
              onClick={() => {
                setSelectedInfo(`Category: ${cat} — $${(cents / 100).toFixed(2)} spent this month`);
                onSelectCategory(cat);
              }}
            />
          );
        })}

        {/* Portfolio Treemap Blocks (East Quadrant) */}
        {holdings.map((h, idx) => {
          const quote = quotes[h.ticker]?.price || 0;
          const mktVal = h.shares * quote;
          const costVal = h.totalCostCents / 100;
          const gainLossPct = costVal > 0 ? ((mktVal - costVal) / costVal) * 100 : 0;

          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const xPos = 3.0 + col * 0.85;
          const zPos = -1.2 + row * 0.85;

          return (
            <PortfolioBlock
              key={h.id}
              position={[xPos, 0, zPos]}
              ticker={h.ticker}
              marketValueDollars={mktVal}
              gainLossPct={gainLossPct}
              onClick={() => {
                setSelectedInfo(`Holding: ${h.ticker} — Value: $${mktVal.toFixed(2)} (${gainLossPct >= 0 ? '+' : ''}${gainLossPct.toFixed(1)}% P&L)`);
                onSelectHolding(h.ticker);
              }}
            />
          );
        })}

        {/* Subtle grid floor */}
        <gridHelper args={[24, 24, '#1e293b', '#0f172a']} position={[0, -0.01, 0]} />

        {/* Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3.5}
          maxDistance={18}
          autoRotate={!isReducedMotion}
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
