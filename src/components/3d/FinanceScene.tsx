'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import {
  Compass,
  PieChart,
  Wallet,
  PiggyBank,
  TrendingUp,
  Sparkles,
  Eye,
  Bot,
  Layers,
} from 'lucide-react';

export type SceneFocusMode = 'overview' | 'expenses' | 'funds' | 'portfolio' | 'mascot-close';

// ============================================================================
// 1. ORIGINAL 3D AVATAR MASCOT: "Aero" — The Wealth Navigator Drone
// Designed from scratch: A sleek aerodynamic celestial automaton.
// Charcoal titanium chassis + Champagne gold astrolabe gyro ring + Visor eyes.
// Zero human caricature, zero assets from any external site.
// ============================================================================
function AeroMascotCompanion({
  focusMode,
  reducedMotion,
  totalNetWorthCents,
  safeToSpendMonthCents,
}: {
  focusMode: SceneFocusMode;
  reducedMotion: boolean;
  totalNetWorthCents: number;
  safeToSpendMonthCents: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const thrusterRef = useRef<THREE.PointLight>(null);

  // Dynamic target positioning for Aero depending on current scene focus
  const targetPos = useMemo(() => {
    switch (focusMode) {
      case 'overview':
        return new THREE.Vector3(1.75, 1.15, 0.4);
      case 'expenses':
        return new THREE.Vector3(0.5, 1.4, 2.8);
      case 'funds':
        return new THREE.Vector3(0.7, 3.8, 1.2);
      case 'portfolio':
        return new THREE.Vector3(2.5, 1.8, 0.4);
      case 'mascot-close':
        return new THREE.Vector3(0, 0, 0); // Centers in close-up view
    }
  }, [focusMode]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (reducedMotion) {
      groupRef.current.position.copy(targetPos);
      groupRef.current.rotation.set(0, -0.2, 0);
      return;
    }

    const time = state.clock.elapsedTime;

    // Smooth lerp transition to target position
    const lerpFactor = Math.min(1, delta * 3.2);
    groupRef.current.position.lerp(targetPos, lerpFactor);

    // Subtle gentle vertical hover bobbing
    const bobOffset = Math.sin(time * 2.4) * 0.08;
    groupRef.current.position.y += bobOffset * 0.08;

    // Aerodynamic banking & yaw rotation
    const baseRotationY = focusMode === 'mascot-close' ? time * 0.4 : -0.25 + Math.sin(time * 1.1) * 0.12;
    groupRef.current.rotation.y = baseRotationY;
    groupRef.current.rotation.z = Math.sin(time * 1.8) * 0.05; // Gentle wing tilt

    // Rotating Champagne Gold Astrolabe Stabilizer Ring
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.2;
    }

    // Dynamic thruster pulse
    if (thrusterRef.current) {
      thrusterRef.current.intensity = 0.8 + Math.sin(time * 6.0) * 0.35;
    }
  });

  return (
    <group ref={groupRef} scale={focusMode === 'mascot-close' ? 1.6 : 0.95}>
      {/* 1. Central Aerodynamic Fuselage (Titanium Charcoal) */}
      <mesh>
        <sphereGeometry args={[0.38, 32, 24]} />
        <meshStandardMaterial
          color="#1e222b"
          roughness={0.22}
          metalness={0.88}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* 2. Sleek Front Curved Glass Visor (Ink Black) */}
      <mesh position={[0, 0.02, 0.26]} rotation={[0.1, 0, 0]}>
        <sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial
          color="#0b0d10"
          roughness={0.08}
          metalness={0.9}
          clearcoat={1.0}
        />
      </mesh>

      {/* 3. Glowing Digital Visor Eyes (Warm Champagne Gold) */}
      {/* Left Eye */}
      <mesh ref={leftEyeRef} position={[-0.09, 0.06, 0.36]}>
        <capsuleGeometry args={[0.022, 0.05, 8, 16]} />
        <meshBasicMaterial color="#f3d99b" />
      </mesh>
      {/* Right Eye */}
      <mesh ref={rightEyeRef} position={[0.09, 0.06, 0.36]}>
        <capsuleGeometry args={[0.022, 0.05, 8, 16]} />
        <meshBasicMaterial color="#f3d99b" />
      </mesh>

      {/* 4. Astrolabe Gyroscopic Stabilizer Ring (Champagne Gold) */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.54, 0.016, 16, 80]} />
        <meshStandardMaterial
          color="#d4af37"
          emissive="#d4af37"
          emissiveIntensity={0.65}
          roughness={0.15}
          metalness={0.92}
        />
      </mesh>

      {/* Micro-nodes on Astrolabe Ring (Compass points) */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
        <mesh
          key={idx}
          position={[Math.cos(angle) * 0.54, 0, Math.sin(angle) * 0.54]}
        >
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial
            color="#f3d99b"
            emissive="#d4af37"
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}

      {/* 5. Aerodynamic Swept Winglets (Side Stabilizers) */}
      {/* Left Wing */}
      <mesh position={[-0.42, -0.04, -0.06]} rotation={[0.1, 0, -0.3]}>
        <boxGeometry args={[0.22, 0.025, 0.16]} />
        <meshStandardMaterial color="#2a2f3a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-0.53, -0.01, -0.06]}>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>

      {/* Right Wing */}
      <mesh position={[0.42, -0.04, -0.06]} rotation={[0.1, 0, 0.3]}>
        <boxGeometry args={[0.22, 0.025, 0.16]} />
        <meshStandardMaterial color="#2a2f3a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.53, -0.01, -0.06]}>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>

      {/* 6. Top Navigation Antenna / Celestial Beacon */}
      <mesh position={[0, 0.44, -0.04]}>
        <cylinderGeometry args={[0.012, 0.018, 0.14, 16]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.52, -0.04]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial
          color="#f3d99b"
          emissive="#d4af37"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* 7. Bottom Micro-Thruster Core & Light Wash */}
      <mesh position={[0, -0.37, 0]}>
        <cylinderGeometry args={[0.1, 0.06, 0.06, 16]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>
      <pointLight
        ref={thrusterRef}
        position={[0, -0.45, 0]}
        color="#d4af37"
        intensity={0.8}
        distance={2.4}
      />
    </group>
  );
}

// ============================================================================
// 2. Camera Controller with High-Order Lerp Easing between Quadrants
// ============================================================================
function CameraController({
  focusMode,
  reducedMotion,
}: {
  focusMode: SceneFocusMode;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const viewConfigs = useMemo(
    () => ({
      overview: {
        position: new THREE.Vector3(0, 5.8, 9.2),
        target: new THREE.Vector3(0, 0, 0),
      },
      expenses: {
        position: new THREE.Vector3(-0.5, 2.7, 6.2),
        target: new THREE.Vector3(-0.2, 0.5, 3.2),
      },
      funds: {
        position: new THREE.Vector3(0, 7.6, 4.2),
        target: new THREE.Vector3(0, 0, 0),
      },
      portfolio: {
        position: new THREE.Vector3(5.4, 3.8, 3.2),
        target: new THREE.Vector3(3.6, 0.8, -0.2),
      },
      'mascot-close': {
        position: new THREE.Vector3(0, 0.3, 2.8),
        target: new THREE.Vector3(0, 0.05, 0),
      },
    }),
    []
  );

  useFrame((_, delta) => {
    const config = viewConfigs[focusMode];
    if (reducedMotion) {
      camera.position.copy(config.position);
      if (controlsRef.current) {
        controlsRef.current.target.copy(config.target);
        controlsRef.current.update();
      }
      return;
    }

    const lerpFactor = Math.min(1, delta * 3.6);
    camera.position.lerp(config.position, lerpFactor);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(config.target, lerpFactor);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={1.8}
      maxDistance={22}
      autoRotate={!reducedMotion && focusMode === 'overview'}
      autoRotateSpeed={0.3}
    />
  );
}

// ============================================================================
// 3. Ambient Warm Champagne Micro-Particle Field
// ============================================================================
function AmbientWarmDust({
  count = 280,
  reducedMotion = false,
}: {
  count?: number;
  reducedMotion?: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const goldColor = new THREE.Color('#d4af37');
    const silverColor = new THREE.Color('#8a96a8');
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = Math.random() * 9 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;

      tempColor.lerpColors(goldColor, silverColor, Math.random());
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((_, delta) => {
    if (!reducedMotion && pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// 4. Central Quantum Net Worth Core (Champagne Gold Faceted Core)
// ============================================================================
function NetWorthCore({
  totalNetWorthCents,
  reducedMotion,
  isDimmed,
}: {
  totalNetWorthCents: number;
  reducedMotion: boolean;
  isDimmed: boolean;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!reducedMotion) {
      if (coreRef.current) {
        coreRef.current.rotation.y += delta * 0.42;
        coreRef.current.rotation.x += delta * 0.2;
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.04;
        coreRef.current.scale.set(scale, scale, scale);
      }
      if (ring1Ref.current) {
        ring1Ref.current.rotation.z += delta * 0.45;
        ring1Ref.current.rotation.x += delta * 0.22;
      }
      if (ring2Ref.current) {
        ring2Ref.current.rotation.y -= delta * 0.38;
        ring2Ref.current.rotation.z += delta * 0.18;
      }
    }
  });

  const dollarsFormatted = (totalNetWorthCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer subtle gold wireframe halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.22, 32, 32]} />
        <meshBasicMaterial
          color="#d4af37"
          transparent
          opacity={isDimmed ? 0.03 : 0.12}
          wireframe
        />
      </mesh>

      {/* Gyroscopic Concentric Rings (Polished Gold) */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[1.44, 0.013, 16, 80]} />
        <meshStandardMaterial
          color="#d4af37"
          emissive="#c59e2b"
          emissiveIntensity={isDimmed ? 0.15 : 0.85}
          roughness={0.16}
          metalness={0.92}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 3, Math.PI / 6]}>
        <torusGeometry args={[1.62, 0.013, 16, 80]} />
        <meshStandardMaterial
          color="#e5c07b"
          emissive="#a88220"
          emissiveIntensity={isDimmed ? 0.15 : 0.75}
          roughness={0.16}
          metalness={0.92}
        />
      </mesh>

      {/* Core crystalline faceted dodecahedron */}
      <mesh ref={coreRef}>
        <dodecahedronGeometry args={[0.88, 0]} />
        <meshStandardMaterial
          color="#d4af37"
          roughness={0.18}
          metalness={0.88}
          emissive="#b8860b"
          emissiveIntensity={isDimmed ? 0.18 : 0.65}
        />
      </mesh>

      {/* Primary Net Worth Metric Text */}
      <Text
        position={[0, -1.45, 0]}
        fontSize={0.25}
        color="#f5f3ef"
        anchorX="center"
        anchorY="middle"
      >
        ${dollarsFormatted}
      </Text>
      <Text
        position={[0, -1.75, 0]}
        fontSize={0.11}
        color="#a8a39d"
        anchorX="center"
        anchorY="middle"
      >
        Net Worth Core
      </Text>
    </group>
  );
}

// ============================================================================
// 5. Sinking Funds Orbiting Rings (Warm Charcoal + Champagne Gold)
// ============================================================================
function FundOrbitRing({
  radius,
  progressRatio,
  name,
  savedDollars,
  targetDollars,
  currency,
  reducedMotion,
  isDimmed,
  onClick,
}: {
  radius: number;
  progressRatio: number;
  name: string;
  savedDollars: number;
  targetDollars: number;
  currency: string;
  reducedMotion: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const ringRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!reducedMotion && ringRef.current) {
      ringRef.current.rotation.z += delta * (0.16 / (radius * 0.42));
    }
  });

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
        <ringGeometry args={[radius - 0.045, radius + 0.045, 64]} />
        <meshBasicMaterial
          color="#1e222b"
          transparent
          opacity={isDimmed ? 0.15 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Progress filled arc in Champagne Gold */}
      <mesh>
        <ringGeometry args={[radius - 0.065, radius + 0.065, 64, 1, 0, arc]} />
        <meshBasicMaterial
          color={hovered ? '#f3d99b' : '#d4af37'}
          transparent
          opacity={isDimmed ? 0.35 : hovered ? 0.98 : 0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbiting Satellite Sphere */}
      <mesh position={[Math.cos(arc) * radius, Math.sin(arc) * radius, 0]}>
        <sphereGeometry args={[0.095, 16, 16]} />
        <meshStandardMaterial
          color="#f3d99b"
          emissive="#d4af37"
          emissiveIntensity={hovered ? 1.0 : 0.7}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// 6. Spending Skyline Bar (South Quadrant — Warm Charcoal & Amber Gold)
// ============================================================================
function SkylineBar({
  position,
  category,
  spentCents,
  maxSpentCents,
  isDimmed,
  onClick,
}: {
  position: [number, number, number];
  category: string;
  spentCents: number;
  maxSpentCents: number;
  isDimmed: boolean;
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
        <boxGeometry args={[0.46, barHeight, 0.46]} />
        <meshStandardMaterial
          color={hovered ? '#e5c07b' : '#3d331f'}
          roughness={0.25}
          metalness={0.65}
          emissive="#a88220"
          emissiveIntensity={isDimmed ? 0.08 : hovered ? 0.75 : 0.25}
        />
      </mesh>

      {/* Roof cap accent line */}
      <mesh position={[0, barHeight / 2 + 0.015, 0]}>
        <boxGeometry args={[0.48, 0.03, 0.48]} />
        <meshStandardMaterial
          color="#f3d99b"
          emissive="#d4af37"
          emissiveIntensity={hovered ? 1.0 : 0.45}
        />
      </mesh>

      <Text
        position={[0, barHeight / 2 + 0.18, 0]}
        fontSize={0.115}
        color={hovered ? '#ffffff' : '#dce3ec'}
        anchorX="center"
        anchorY="bottom"
      >
        {category.substring(0, 9)}
      </Text>
    </group>
  );
}

// ============================================================================
// 7. Portfolio Treemap 3D Block (East Quadrant)
// STRICT ACCEPTANCE CHECK 6 PRESERVATION:
// Height formula: max(0.25, min(2.2, 0.35 + (|P&L%| / 25) * 1.0))
// P&L = 0% -> height = 0.35
// P&L = +25% -> height = 1.35
// P&L = -25% -> height = 1.35 (symmetric magnitude)
// P&L = +50% -> height = 2.20 (clamped max)
// Color = Refined Emerald (Gain) or Refined Terracotta (Loss)
// ============================================================================
function PortfolioBlock({
  position,
  ticker,
  marketValueDollars,
  gainLossPct,
  isDimmed,
  onClick,
}: {
  position: [number, number, number];
  ticker: string;
  marketValueDollars: number;
  gainLossPct: number;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Block size proportional to position value
  const size = Math.max(0.5, Math.min(1.4, Math.sqrt(marketValueDollars / 2000) * 0.7));

  // Block height strictly proportional to magnitude of unrealized P&L %
  const pnlMagnitude = Math.abs(gainLossPct);
  const height = Math.max(0.25, Math.min(2.2, 0.35 + (pnlMagnitude / 25) * 1.0));

  const isGain = gainLossPct >= 0;
  const color = isGain
    ? hovered
      ? '#4ade80'
      : '#22c55e' // Refined Warm Emerald
    : hovered
    ? '#f87171'
    : '#ef4444'; // Refined Terracotta

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
          metalness={0.55}
          emissive={isGain ? '#16a34a' : '#dc2626'}
          emissiveIntensity={isDimmed ? 0.12 : hovered ? 0.75 : 0.3}
        />
      </mesh>

      <Text
        position={[0, height / 2 + 0.15, 0]}
        fontSize={0.135}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
      >
        {ticker}
      </Text>
    </group>
  );
}

// ============================================================================
// 8. Main 3D FinanceScene Export
// ============================================================================
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
  const {
    totalNetWorthCents,
    totalFundsCents,
    totalPortfolioCents,
    safeToSpendMonthCents,
    funds,
    expenses,
    holdings,
    quotes,
    settings,
  } = useStore();

  const [focusMode, setFocusMode] = useState<SceneFocusMode>('overview');
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);

  const isReducedMotion = useMemo(() => {
    if (settings.useReducedMotion) return true;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return true;
    }
    return false;
  }, [settings.useReducedMotion]);

  // Category aggregates for Expense Skyline
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
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-charcoal-800 bg-[#0b0d10] shadow-2xl">
      {/* 3D Command Deck Header & View Controls */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 max-w-[calc(100%-2rem)]">
        <div className="rounded-xl border border-charcoal-800/90 bg-[#111419]/90 p-3.5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-gold-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                FundPilot 3D Command Deck
              </span>
            </div>
            <span className="text-[10px] text-charcoal-400 font-mono">
              Net Worth: ${(totalNetWorthCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* 4-Bucket Summary Strip */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-charcoal-300 border-t border-charcoal-800/80 pt-2">
            <span>
              1. Cash: <strong className="text-gold-300">${(settings.bankCashCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong>
            </span>
            <span className="text-charcoal-600">•</span>
            <span>
              2. Funds: <strong className="text-gold-400">${(totalFundsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong>
            </span>
            <span className="text-charcoal-600">•</span>
            <span>
              3. Port: <strong className="text-gain-400">${(totalPortfolioCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong>
            </span>
            <span className="text-charcoal-600">•</span>
            <span>
              4. Credit: <strong className="text-loss-400">-${(settings.creditCardOwedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong>
            </span>
          </div>

          {/* Continuous View Transitions & Mascot Close-Up Selector */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-charcoal-800/80 pt-2">
            <span className="text-[10px] text-charcoal-400 uppercase font-semibold mr-1">Focus:</span>
            <button
              onClick={() => {
                setFocusMode('overview');
                setSelectedInfo(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'overview'
                  ? 'bg-gold-400/20 text-gold-300 border border-gold-400/40 shadow-sm'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 border border-transparent'
              }`}
            >
              <PieChart className="h-3 w-3" />
              Overview
            </button>
            <button
              onClick={() => {
                setFocusMode('expenses');
                setSelectedInfo('Focusing South Quadrant: Monthly Expense Skyline');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'expenses'
                  ? 'bg-gold-400/20 text-gold-300 border border-gold-400/40 shadow-sm'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 border border-transparent'
              }`}
            >
              <Wallet className="h-3 w-3" />
              Expense Skyline
            </button>
            <button
              onClick={() => {
                setFocusMode('funds');
                setSelectedInfo('Focusing Radial Orbits: Sinking Fund Rings');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'funds'
                  ? 'bg-gold-400/20 text-gold-300 border border-gold-400/40 shadow-sm'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 border border-transparent'
              }`}
            >
              <PiggyBank className="h-3 w-3" />
              Sinking Orbits
            </button>
            <button
              onClick={() => {
                setFocusMode('portfolio');
                setSelectedInfo('Focusing East Quadrant: 3D Treemap Blocks (Height = |P&L %|)');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'portfolio'
                  ? 'bg-gain-500/20 text-gain-300 border border-gain-500/40 shadow-sm'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/50 border border-transparent'
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Portfolio Treemap
            </button>
            <button
              onClick={() => {
                setFocusMode('mascot-close');
                setSelectedInfo('Companion Mode: Aero the Wealth Navigator Drone (Faceted Titanium & Gold Astrolabe)');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'mascot-close'
                  ? 'bg-gold-400 text-charcoal-950 font-bold border border-gold-300 shadow-sm'
                  : 'text-gold-400 hover:text-gold-200 hover:bg-charcoal-800/50 border border-gold-400/20'
              }`}
            >
              <Bot className="h-3 w-3" />
              Meet Aero
            </button>
          </div>
        </div>
      </div>

      {/* Selected Element Interactive HUD Banner */}
      {selectedInfo && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-full border border-gold-400/40 bg-[#111419]/95 px-4 py-2 text-xs font-medium text-gold-300 shadow-2xl backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-gold-400 animate-spin" />
          <span>{selectedInfo}</span>
        </div>
      )}

      {/* R3F Canvas in Warm Charcoal Background */}
      <Canvas
        camera={{ position: [0, 5.8, 9.2], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => setSelectedInfo(null)}
      >
        <color attach="background" args={['#0b0d10']} />
        <fog attach="fog" args={['#0b0d10', 10, 24]} />
        <ambientLight intensity={0.8} />
        {/* Warm Champagne Directional & Fill Lighting */}
        <pointLight position={[10, 12, 10]} intensity={1.4} color="#fbf8f0" />
        <pointLight position={[-10, 6, -10]} intensity={0.7} color="#d4af37" />
        <pointLight position={[0, -4, 4]} intensity={0.4} color="#a88220" />

        {/* Ambient Warm Floating Dust */}
        <AmbientWarmDust count={280} reducedMotion={isReducedMotion} />

        {/* 1. ORIGINAL 3D AVATAR MASCOT: "AERO" */}
        <AeroMascotCompanion
          focusMode={focusMode}
          reducedMotion={isReducedMotion}
          totalNetWorthCents={totalNetWorthCents}
          safeToSpendMonthCents={safeToSpendMonthCents}
        />

        {/* 2. Quantum Net Worth Core */}
        {focusMode !== 'mascot-close' && (
          <NetWorthCore
            totalNetWorthCents={totalNetWorthCents}
            reducedMotion={isReducedMotion}
            isDimmed={focusMode !== 'overview'}
          />
        )}

        {/* 3. Sinking Funds Orbiting Rings */}
        {focusMode !== 'mascot-close' &&
          funds.map((fund, idx) => {
            const ratio =
              fund.targetAmountCents > 0
                ? fund.currentAmountCents / fund.targetAmountCents
                : 0;
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
                isDimmed={focusMode !== 'overview' && focusMode !== 'funds'}
                onClick={() => {
                  setSelectedInfo(
                    `Fund: ${fund.name} — $${(fund.currentAmountCents / 100).toFixed(0)} of $${(fund.targetAmountCents / 100).toFixed(0)} (${(ratio * 100).toFixed(0)}%)`
                  );
                  onSelectFund(fund.id);
                }}
              />
            );
          })}

        {/* 4. Spending Skyline (South Quadrant) */}
        {focusMode !== 'mascot-close' &&
          categorySpendMap.map(([cat, cents], idx) => {
            const xPos = -2.2 + idx * 0.85;
            const zPos = 3.2;
            return (
              <SkylineBar
                key={cat}
                position={[xPos, 0, zPos]}
                category={cat}
                spentCents={cents}
                maxSpentCents={maxCategorySpend}
                isDimmed={focusMode !== 'overview' && focusMode !== 'expenses'}
                onClick={() => {
                  setSelectedInfo(
                    `Category: ${cat} — $${(cents / 100).toFixed(2)} spent this month`
                  );
                  onSelectCategory(cat);
                }}
              />
            );
          })}

        {/* 5. Portfolio Treemap Blocks (East Quadrant) */}
        {focusMode !== 'mascot-close' &&
          holdings.map((h, idx) => {
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
                isDimmed={focusMode !== 'overview' && focusMode !== 'portfolio'}
                onClick={() => {
                  setSelectedInfo(
                    `Holding: ${h.ticker} — Value: $${mktVal.toFixed(2)} (${gainLossPct >= 0 ? '+' : ''}${gainLossPct.toFixed(1)}% P&L)`
                  );
                  onSelectHolding(h.ticker);
                }}
              />
            );
          })}

        {/* Coordinate Ground Grid (Warm Charcoal) */}
        <gridHelper args={[26, 26, '#2c323f', '#14171d']} position={[0, -0.01, 0]} />

        {/* Camera Lerp Controller */}
        <CameraController focusMode={focusMode} reducedMotion={isReducedMotion} />
      </Canvas>
    </div>
  );
}
