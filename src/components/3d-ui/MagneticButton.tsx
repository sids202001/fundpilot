'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { usePointer3D } from './usePointer3D';

interface MagneticButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  children: React.ReactNode;
  /** Max magnetic pull in pixels (6–8px) */
  maxPull?: number;
}

/**
 * 3. Magnetic Button (Primary CTAs only — not icon buttons or row actions)
 * Magnetic pull max 6–8px + slight 3D tilt + tactile press-down.
 * Respects prefers-reduced-motion and disables magnetic pull on touch devices.
 */
export function MagneticButton({
  children,
  className = '',
  maxPull = 7,
  type = 'button',
  ...props
}: MagneticButtonProps) {
  const enabled = usePointer3D();
  const ref = useRef<HTMLButtonElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawRotX = useMotionValue(0);
  const rawRotY = useMotionValue(0);

  const x = useSpring(rawX, { stiffness: 320, damping: 20, mass: 0.45 });
  const y = useSpring(rawY, { stiffness: 320, damping: 20, mass: 0.45 });
  const rotateX = useSpring(rawRotX, { stiffness: 320, damping: 22 });
  const rotateY = useSpring(rawRotY, { stiffness: 320, damping: 22 });

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    const pullX = Math.max(-maxPull, Math.min(maxPull, nx * maxPull * 2));
    const pullY = Math.max(-maxPull, Math.min(maxPull, ny * maxPull * 2));

    rawX.set(pullX);
    rawY.set(pullY);
    rawRotX.set(-ny * 8);
    rawRotY.set(nx * 8);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
    rawRotX.set(0);
    rawRotY.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileTap={enabled ? { scale: 0.96, y: 1.5 } : undefined}
      style={{
        x: enabled ? x : 0,
        y: enabled ? y : 0,
        rotateX: enabled ? rotateX : 0,
        rotateY: enabled ? rotateY : 0,
        transformPerspective: 600,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}
