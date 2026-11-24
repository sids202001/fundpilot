'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { usePointer3D } from './usePointer3D';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees (defaults to 4.8° — low intensity, crisp readability) */
  maxTilt?: number;
  onClick?: () => void;
}

/**
 * 2. 3D Tilt Card Hover (Follow mode, low intensity ~4–6°, spring back on leave)
 * Reusable wrapper for Dashboard summary cards, Sinking Funds cards, and Investments cards.
 * Inner elements with .tilt-z-sm / .tilt-z-md / .tilt-z-lg float at distinct translateZ depths.
 */
export function TiltCard({
  children,
  className = '',
  maxTilt = 4.8,
  onClick,
}: TiltCardProps) {
  const enabled = usePointer3D();
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawMouseX = useMotionValue(50);
  const rawMouseY = useMotionValue(50);

  const rotateX = useSpring(rawX, { stiffness: 250, damping: 22, mass: 0.55 });
  const rotateY = useSpring(rawY, { stiffness: 250, damping: 22, mass: 0.55 });
  const glareX = useSpring(rawMouseX, { stiffness: 280, damping: 26 });
  const glareY = useSpring(rawMouseY, { stiffness: 280, damping: 26 });

  const glareBg = useMotionTemplate`radial-gradient(300px circle at ${glareX}% ${glareY}%, rgba(212, 175, 55, 0.15) 0%, transparent 68%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Follow mode: card leans gently toward cursor
    const effectiveTilt = rect.width > 540 ? Math.min(maxTilt, 3.2) : maxTilt;
    rawX.set((0.5 - py) * effectiveTilt * 2);
    rawY.set((px - 0.5) * effectiveTilt * 2);
    rawMouseX.set(px * 100);
    rawMouseY.set(py * 100);
  };

  const handlePointerLeave = () => {
    setHovered(false);
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <div style={{ perspective: '1000px' }} className="h-full">
      <motion.div
        ref={ref}
        onClick={onClick}
        onPointerMove={handlePointerMove}
        onPointerEnter={() => enabled && setHovered(true)}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX: enabled ? rotateX : 0,
          rotateY: enabled ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        className={`tilt-card-3d relative h-full ${hovered ? 'is-tilting' : ''} ${className}`}
      >
        {/* Cursor-following warm gold specular sheen */}
        <motion.div
          aria-hidden="true"
          style={{ background: glareBg }}
          animate={{ opacity: enabled && hovered ? 1 : 0 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        />
        {children}
      </motion.div>
    </div>
  );
}
