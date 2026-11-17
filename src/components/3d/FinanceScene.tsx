'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, getLocalMonth } from '@/lib/store';
import { formatMoney, convertCurrency } from '@/lib/currencies';
import {
  Compass,
  PieChart,
  Wallet,
  PiggyBank,
  TrendingUp,
  Sparkles,
  Bot,
  Layers,
  AlertTriangle,
  Smile,
} from 'lucide-react';

export type SceneFocusMode = 'overview' | 'expenses' | 'funds' | 'investments' | 'mascot-close';

// ============================================================================
// 1. ORIGINAL 3D AVATAR MASCOT: "Aero" — The Wealth Navigator Drone
// RENDERED EXCLUSIVELY IN 'mascot-close' (Meet Aero) VIEW (Fix 14)
// Sleek aerodynamic automaton with 3 reactive financial states:
// - Celebration (savings >= 20% or net worth high): Bright radiant gold eyes, celebratory bobbing
// - Caution (safe-to-spend < $200 or credit debt > bank cash): Alert amber visor eyes
// - Guidance (normal/reconciled): Serene champagne gold, calm steady gyroscopic orbit
// ============================================================================
function AeroMascotCompanion({
  reducedMotion,
  reactiveState,
}: {
  reducedMotion: boolean;
  reactiveState: 'celebration' | 'caution' | 'guidance';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const thrusterRef = useRef<THREE.PointLight>(null);

  const eyeColor = useMemo(() => {
    switch (reactiveState) {
      case 'celebration':
        return '#fef08a'; // Bright vibrant gold
      case 'caution':
        return '#f59e0b'; // Amber warning
      case 'guidance':
      default:
        return '#f3d99b'; // Calm champagne
    }
  }, [reactiveState]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (reducedMotion) {
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
      return;
    }

    const time = state.clock.elapsedTime;
    const speedMultiplier = reactiveState === 'celebration' ? 1.5 : reactiveState === 'caution' ? 1.2 : 0.8;

    // Hover bobbing
    const bobOffset = Math.sin(time * 2.4 * speedMultiplier) * (reactiveState === 'celebration' ? 0.12 : 0.06);
    groupRef.current.position.y = bobOffset;

    // Yaw rotation
    groupRef.current.rotation.y = time * 0.35;
    groupRef.current.rotation.z = Math.sin(time * 1.5) * 0.04;

    // Rotating Astrolabe Gyroscopic Ring
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (reactiveState === 'celebration' ? 1.8 : 1.1);
    }

    // Dynamic thruster pulse
    if (thrusterRef.current) {
      thrusterRef.current.intensity = 0.8 + Math.sin(time * 5.0) * 0.35;
    }
  });

  return (
    <group ref={groupRef} scale={1.5}>
      {/* 1. Central Aerodynamic Fuselage (Titanium Charcoal) */}
      <mesh>
        <sphereGeometry args={[0.38, 32, 24]} />
        <meshStandardMaterial
          color="#1e222b"
          roughness={0.22}
          metalness={0.88}
        />
      </mesh>

      {/* 2. Front Curved Glass Visor (Ink Black) */}
      <mesh position={[0, 0.02, 0.26]} rotation={[0.1, 0, 0]}>
        <sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial
          color="#0b0d10"
          roughness={0.08}
          metalness={0.9}
          clearcoat={1.0}
        />
      </mesh>

      {/* 3. Reactive Glowing Digital Visor Eyes */}
      <mesh ref={leftEyeRef} position={[-0.09, 0.06, 0.36]}>
        <capsuleGeometry args={[0.022, 0.05, 8, 16]} />
        <meshBasicMaterial color={eyeColor} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.09, 0.06, 0.36]}>
        <capsuleGeometry args={[0.022, 0.05, 8, 16]} />
        <meshBasicMaterial color={eyeColor} />
      </mesh>

      {/* 4. Astrolabe Gyroscopic Stabilizer Ring (Champagne Gold) */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.54, 0.016, 16, 80]} />
        <meshStandardMaterial
          color="#d4af37"
          emissive="#d4af37"
          emissiveIntensity={reactiveState === 'celebration' ? 0.9 : 0.6}
          roughness={0.15}
          metalness={0.92}
        />
      </mesh>

      {/* Compass Points */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
        <mesh key={idx} position={[Math.cos(angle) * 0.54, 0, Math.sin(angle) * 0.54]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#f3d99b" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Lower Thruster Beacon */}
      <pointLight
        ref={thrusterRef}
        position={[0, -0.45, 0]}
        color={eyeColor}
        intensity={0.8}
        distance={2.4}
      />
    </group>
  );
}

// ============================================================================
// 2. Camera Controller with Lerp Easing between Quadrants
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
      investments: {
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
  count = 240,
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
// 4. Central Net Worth Core (Champagne Gold Faceted Core)
// ============================================================================
function NetWorthCore({
  totalNetWorthCents,
  displayCurrency,
  reducedMotion,
  isDimmed,
}: {
  totalNetWorthCents: number;
  displayCurrency: string;
  reducedMotion: boolean;
  isDimmed: boolean;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

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

  const formattedStr = formatMoney(totalNetWorthCents, displayCurrency);

  return (
    <group position={[0, 0, 0]}>
      {/* Outer subtle gold wireframe halo */}
      <mesh>
        <sphereGeometry args={[1.22, 32, 32]} />
        <meshBasicMaterial
          color="#d4af37"
          transparent
          opacity={isDimmed ? 0.03 : 0.12}
          wireframe
        />
      </mesh>

      {/* Gyroscopic Concentric Rings */}
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

      {/* Metric Label */}
      <Text
        position={[0, -1.45, 0]}
        fontSize={0.25}
        color="#f5f3ef"
        anchorX="center"
        anchorY="middle"
      >
        {formattedStr}
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
// 5. Sinking Funds Orbiting Rings
// ============================================================================
function FundOrbitRing({
  radius,
  progressRatio,
  name,
  savedCents,
  targetCents,
  currency,
  reducedMotion,
  isDimmed,
  onClick,
}: {
  radius: number;
  progressRatio: number;
  name: string;
  savedCents: number;
  targetCents: number;
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
// 6. Spending Skyline Bar (South Quadrant)
// ============================================================================
function SkylineBar({
  position,
  category,
  spentCents,
  maxSpentCents,
  currency,
  isDimmed,
  onClick,
}: {
  position: [number, number, number];
  category: string;
  spentCents: number;
  maxSpentCents: number;
  currency: string;
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
// 7. Manual Investments 3D Block (East Quadrant)
// LOCKED SPEC:
// One 3D block per entry. Block size = total value ONLY.
// Gold tones only — NO gain/loss colors, NO P&L height, NO percentages!
// Height is uniform (0.5), size represents value magnitude.
// Always shows label and updated date.
// ============================================================================
function InvestmentBlock({
  position,
  label,
  type,
  amountDollars,
  lastUpdated,
  currency,
  isDimmed,
  onClick,
}: {
  position: [number, number, number];
  label: string;
  type: string;
  amountDollars: number;
  lastUpdated: string;
  currency: string;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Size strictly proportional to total value magnitude
  const size = Math.max(0.45, Math.min(1.4, Math.sqrt(Math.max(10, amountDollars) / 1000) * 0.5));
  const height = 0.5;

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
          color={hovered ? '#f3d99b' : '#d4af37'}
          roughness={0.2}
          metalness={0.8}
          emissive="#b8860b"
          emissiveIntensity={isDimmed ? 0.1 : hovered ? 0.75 : 0.35}
        />
      </mesh>

      {/* Top Gold Cap */}
      <mesh position={[0, height / 2 + 0.01, 0]}>
        <boxGeometry args={[size * 0.96, 0.02, size * 0.96]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#d4af37"
          emissiveIntensity={hovered ? 0.9 : 0.4}
        />
      </mesh>

      <Text
        position={[0, height / 2 + 0.15, 0]}
        fontSize={0.12}
        color="#f5f3ef"
        anchorX="center"
        anchorY="bottom"
      >
        {label || type}
      </Text>
    </group>
  );
}

// ============================================================================
// 8. Main 3D FinanceScene Export with WebGL Guard & Reactive Aero
// ============================================================================
export function FinanceScene({
  onSelectCategory,
  onSelectFund,
  onSelectInvestment,
  onWebGLFailed,
}: {
  onSelectCategory: (cat: string) => void;
  onSelectFund: (fundId: string) => void;
  onSelectInvestment: (id: string) => void;
  onWebGLFailed?: () => void;
}) {
  const {
    totalNetWorthCents,
    totalFundsCents,
    totalInvestmentsCents,
    totalBankCashCents,
    totalCreditOwedCents,
    safeToSpendMonthCents,
    funds,
    expenses,
    investments,
    displayCurrency,
    rates,
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

  // Reactive State for Aero Companion (Fix 14)
  const reactiveAeroState = useMemo<'celebration' | 'caution' | 'guidance'>(() => {
    if (safeToSpendMonthCents < 20000 || totalCreditOwedCents > totalBankCashCents) {
      return 'caution';
    }
    const currentMonth = getLocalMonth();
    const spentThisMonth = expenses
      .filter((e) => e.date.startsWith(currentMonth) && (e.entryType || 'debit') === 'debit')
      .reduce((s, e) => s + e.amountCents, 0);
    const incomeThisMonth = settings.monthlyIncomeCents;
    if (incomeThisMonth > 0 && (incomeThisMonth - spentThisMonth) / incomeThisMonth >= 0.2) {
      return 'celebration';
    }
    return 'guidance';
  }, [safeToSpendMonthCents, totalCreditOwedCents, totalBankCashCents, expenses, settings.monthlyIncomeCents]);

  const aeroMessage = useMemo(() => {
    switch (reactiveAeroState) {
      case 'celebration':
        return 'Finances thriving — on track for your savings goals!';
      case 'caution':
        return 'Discretionary spending is tight this month. Monitor upcoming expenses.';
      case 'guidance':
      default:
        return 'All accounts, sinking funds, and manual investment totals reconciled.';
    }
  }, [reactiveAeroState]);

  // Category aggregates for Expense Skyline
  const categorySpendMap = useMemo(() => {
    const map = new Map<string, number>();
    const currentMonth = getLocalMonth();
    expenses
      .filter((e) => e.date.startsWith(currentMonth) && (e.entryType || 'debit') === 'debit')
      .forEach((e) => {
        map.set(e.category, (map.get(e.category) || 0) + e.amountCents);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [expenses]);

  const maxCategorySpend = useMemo(() => {
    return Math.max(1, ...categorySpendMap.map((c) => c[1]));
  }, [categorySpendMap]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-[#1e222b] bg-[#0b0d10] shadow-2xl">
      {/* 3D Command Deck Header & Controls */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 max-w-[calc(100%-2rem)]">
        <div className="rounded-xl border border-[#1e222b] bg-[#111419]/90 p-3.5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-gold animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-gold-light">
                FundPilot 3D Command Deck
              </span>
            </div>
            <span className="text-[10px] text-[#9e9a93] font-mono">
              Net Worth: {formatMoney(totalNetWorthCents, displayCurrency)}
            </span>
          </div>

          {/* 4-Bucket Summary Strip */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#c8c4bc] border-t border-[#1e222b] pt-2">
            <span>
              1. Cash: <strong className="text-[#e5c07b]">{formatMoney(totalBankCashCents, displayCurrency)}</strong>
            </span>
            <span className="text-[#3a3f4d]">•</span>
            <span>
              2. Funds: <strong className="text-gold-light">{formatMoney(totalFundsCents, displayCurrency)}</strong>
            </span>
            <span className="text-[#3a3f4d]">•</span>
            <span>
              3. Inv: <strong className="text-gain">{formatMoney(totalInvestmentsCents, displayCurrency)}</strong>
            </span>
            <span className="text-[#3a3f4d]">•</span>
            <span>
              4. Credit: <strong className="text-loss">-{formatMoney(totalCreditOwedCents, displayCurrency)}</strong>
            </span>
          </div>

          {/* View Transitions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#1e222b] pt-2">
            <span className="text-[10px] text-[#9e9a93] uppercase font-semibold mr-1">Focus:</span>
            <button
              onClick={() => {
                setFocusMode('overview');
                setSelectedInfo(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'overview'
                  ? 'bg-gold/20 text-gold-light border border-gold/40 shadow-sm'
                  : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1e222b] border border-transparent'
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
                  ? 'bg-gold/20 text-gold-light border border-gold/40 shadow-sm'
                  : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1e222b] border border-transparent'
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
                  ? 'bg-gold/20 text-gold-light border border-gold/40 shadow-sm'
                  : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1e222b] border border-transparent'
              }`}
            >
              <PiggyBank className="h-3 w-3" />
              Sinking Orbits
            </button>
            <button
              onClick={() => {
                setFocusMode('investments');
                setSelectedInfo('Focusing East Quadrant: Manual Investment Totals (Gold Tones Only)');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'investments'
                  ? 'bg-gold/20 text-gold-light border border-gold/40 shadow-sm'
                  : 'text-[#9e9a93] hover:text-[#f5f3ef] hover:bg-[#1e222b] border border-transparent'
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Investments ({investments.length})
            </button>
            <button
              onClick={() => {
                setFocusMode('mascot-close');
                setSelectedInfo(`Companion Aero: ${aeroMessage}`);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                focusMode === 'mascot-close'
                  ? 'bg-gold text-[#0b0d10] font-bold border border-gold-light shadow-sm'
                  : 'text-gold-light hover:text-gold hover:bg-[#1e222b] border border-gold/20'
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
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-full border border-gold/40 bg-[#111419]/95 px-4 py-2 text-xs font-medium text-gold-light shadow-2xl backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-gold animate-spin" />
          <span>{selectedInfo}</span>
        </div>
      )}

      {/* R3F Canvas in Warm Charcoal Background */}
      <Canvas
        camera={{ position: [0, 5.8, 9.2], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => setSelectedInfo(null)}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => {
            if (onWebGLFailed) onWebGLFailed();
          });
        }}
      >
        <color attach="background" args={['#0b0d10']} />
        <fog attach="fog" args={['#0b0d10', 10, 24]} />
        <ambientLight intensity={0.9} />
        {/* Warm Champagne Directional & Fill Lighting */}
        <pointLight position={[10, 12, 10]} intensity={1.5} color="#fbf8f0" />
        <pointLight position={[-10, 6, -10]} intensity={0.8} color="#d4af37" />
        <pointLight position={[0, -4, 4]} intensity={0.5} color="#a88220" />

        {/* Ambient Warm Floating Dust */}
        <AmbientWarmDust count={240} reducedMotion={isReducedMotion} />

        {/* 1. ORIGINAL 3D AVATAR MASCOT: "AERO" (RENDERED ONLY IN 'mascot-close' VIEW) */}
        {focusMode === 'mascot-close' && (
          <AeroMascotCompanion
            reducedMotion={isReducedMotion}
            reactiveState={reactiveAeroState}
          />
        )}

        {/* 2. Net Worth Core */}
        {focusMode !== 'mascot-close' && (
          <NetWorthCore
            totalNetWorthCents={totalNetWorthCents}
            displayCurrency={displayCurrency}
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
                savedCents={fund.currentAmountCents}
                targetCents={fund.targetAmountCents}
                currency={fund.currency}
                reducedMotion={isReducedMotion}
                isDimmed={focusMode !== 'overview' && focusMode !== 'funds'}
                onClick={() => {
                  setSelectedInfo(
                    `Fund: ${fund.name} — ${formatMoney(fund.currentAmountCents, fund.currency)} of ${formatMoney(fund.targetAmountCents, fund.currency)} (${(ratio * 100).toFixed(0)}%)`
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
                currency={displayCurrency}
                isDimmed={focusMode !== 'overview' && focusMode !== 'expenses'}
                onClick={() => {
                  setSelectedInfo(
                    `Category: ${cat} — ${formatMoney(cents, displayCurrency)} spent this month`
                  );
                  onSelectCategory(cat);
                }}
              />
            );
          })}

        {/* 5. Manual Investments 3D Blocks (East Quadrant) */}
        {focusMode !== 'mascot-close' &&
          investments.map((inv, idx) => {
            const conv = convertCurrency(inv.amountCents, inv.currency, displayCurrency, rates);
            const amountDollars = (conv ? conv.convertedAmount : inv.amountCents) / 100;

            const row = Math.floor(idx / 3);
            const col = idx % 3;
            const xPos = 3.0 + col * 0.85;
            const zPos = -1.2 + row * 0.85;

            return (
              <InvestmentBlock
                key={inv.id}
                position={[xPos, 0, zPos]}
                label={inv.label || inv.type}
                type={inv.type}
                amountDollars={amountDollars}
                lastUpdated={inv.lastUpdated}
                currency={displayCurrency}
                isDimmed={focusMode !== 'overview' && focusMode !== 'investments'}
                onClick={() => {
                  setSelectedInfo(
                    `Investment: ${inv.label || inv.type} — ${formatMoney(inv.amountCents, inv.currency)} (Updated: ${inv.lastUpdated})`
                  );
                  onSelectInvestment(inv.id);
                }}
              />
            );
          })}

        {/* Coordinate Ground Grid (Warm Charcoal) */}
        <gridHelper args={[26, 26, '#262930', '#111419']} position={[0, -0.01, 0]} />

        {/* Camera Lerp Controller */}
        <CameraController focusMode={focusMode} reducedMotion={isReducedMotion} />
      </Canvas>
    </div>
  );
}
