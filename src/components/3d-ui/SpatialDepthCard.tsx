'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { usePointer3D } from './usePointer3D';

interface SpatialDepthCardProps {
  children: React.ReactNode;
  watermark?: string;
  className?: string;
}

/**
 * 1. Spatial Depth Card (Dashboard Net Worth hero card only)
 * Four distinct depth layers in preserve-3d space:
 *   Layer 1 (back, -22px):    Faint champagne-gold architectural grid
 *   Layer 2 (mid-back, -10px): Oversized subtle gold watermark
 *   Layer 3 (surface, 0px):   Frosted charcoal glass card + cursor-following gold specular light
 *   Layer 4 (front, +24px):   Foreground balance & content lifted forward in Z
 * Subtle 3° max spring tilt so numbers stay 100% readable at all times.
 */
export function SpatialDepthCard({
  children,
  watermark = '$',
  className = '',
}: SpatialDepthCardProps) {
  const enabled = usePointer3D();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawMouseX = useMotionValue(50);
  const rawMouseY = useMotionValue(50);

  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 24, mass: 0.6 });
  const rotateY = useSpring(rawRotateY, { stiffness: 220, damping: 24, mass: 0.6 });
  const specularX = useSpring(rawMouseX, { stiffness: 260, damping: 28 });
  const specularY = useSpring(rawMouseY, { stiffness: 260, damping: 28 });

  const specularBg = useMotionTemplate`radial-gradient(280px circle at ${specularX}% ${specularY}%, rgba(243, 217, 155, 0.24) 0%, rgba(212, 175, 55, 0.1) 38%, transparent 72%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Subtle 3° max tilt so balance numbers stay crisp and readable
    const maxTilt = 3.2;
    rawRotateX.set((0.5 - py) * maxTilt * 2);
    rawRotateY.set((px - 0.5) * maxTilt * 2);
    rawMouseX.set(px * 100);
    rawMouseY.set(py * 100);
  };

  const handlePointerEnter = () => {
    if (enabled) setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    <div style={{ perspective: '1000px' }} className="h-full">
      <motion.div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX: enabled ? rotateX : 0,
          rotateY: enabled ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        className={`spatial-depth-card relative h-full overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-gradient-to-br from-[#1b1f29]/85 via-[#13161e]/92 to-[#0e1117]/95 p-6 backdrop-blur-xl shadow-[0_22px_48px_-16px_rgba(0,0,0,0.9),0_0_30px_-8px_rgba(212,175,55,0.16),inset_0_1px_0_rgba(243,217,155,0.22)] transition-colors duration-300 hover:border-[#d4af37]/50 ${className}`}
      >
        {/* LAYER 1 (Back): Faint architectural champagne-gold grid */}
        <div
          aria-hidden="true"
          style={{
            transform: enabled ? 'translateZ(-22px) scale(1.06)' : undefined,
            backgroundImage:
              'linear-gradient(to right, rgba(212, 175, 55, 0.085) 1px, transparent 1px), linear-gradient(to bottom, rgba(212, 175, 55, 0.085) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 85% 85% at 50% 45%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 45%, black 30%, transparent 100%)',
          }}
          className="pointer-events-none absolute inset-0 z-0"
        />

        {/* LAYER 2 (Mid-back): Oversized subtle gold watermark */}
        <div
          aria-hidden="true"
          style={{
            transform: enabled ? 'translateZ(-10px)' : undefined,
          }}
          className="pointer-events-none absolute -bottom-5 -right-2 z-0 select-none font-serif text-[128px] font-black leading-none tracking-tighter text-[#d4af37]/[0.07]"
        >
          {watermark}
        </div>

        {/* LAYER 3 (Surface): Gold specular light following the cursor */}
        <motion.div
          aria-hidden="true"
          style={{ background: specularBg }}
          animate={{ opacity: enabled && isHovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl"
        />

        {/* Top gold accent bar */}
        <div className="pointer-events-none absolute right-0 top-0 z-[2] h-1 w-full bg-gradient-to-r from-[#d4af37] via-[#f3d99b] to-[#b8860b]" />

        {/* LAYER 4 (Foreground): Content lifted forward in 3D space */}
        <div
          style={{
            transform: enabled ? 'translateZ(24px)' : undefined,
            transformStyle: 'preserve-3d',
          }}
          className="relative z-[3]"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
