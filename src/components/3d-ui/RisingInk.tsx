'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePointer3D } from './usePointer3D';

interface RisingInkProps {
  text: string;
  className?: string;
}

/**
 * 4. Rising Ink (FundPilot wordmark in Navbar + Dashboard heading ONLY)
 * Shallow gold 3D extrusion + short spring letter lift on cursor pass.
 * Respects prefers-reduced-motion and disables on touch/coarse pointers.
 */
export function RisingInk({ text, className = '' }: RisingInkProps) {
  const enabled = usePointer3D();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [cursorRatio, setCursorRatio] = useState<number | null>(null);

  const chars = Array.from(text);

  const handlePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!enabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    setCursorRatio((e.clientX - rect.left) / rect.width);
  };

  const handlePointerLeave = () => {
    setCursorRatio(null);
  };

  return (
    <span
      ref={containerRef}
      aria-label={text}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`rising-ink inline-flex select-none ${className}`}
    >
      {chars.map((char, idx) => {
        const charCenter = (idx + 0.5) / chars.length;
        const dist = cursorRatio !== null ? Math.abs(cursorRatio - charCenter) : 1;
        const proximity = cursorRatio !== null ? Math.max(0, 1 - dist / 0.24) : 0;
        const liftY = enabled ? -proximity * 4.5 : 0;

        return (
          <motion.span
            key={idx}
            aria-hidden="true"
            animate={{
              y: liftY,
              color: proximity > 0.35 ? '#f3d99b' : undefined,
            }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 22,
              mass: 0.4,
            }}
            className="inline-block"
            style={{
              textShadow:
                '0 1px 0 rgba(163, 126, 28, 0.7), 0 2px 0 rgba(90, 67, 20, 0.55), 0 4px 10px rgba(212, 175, 55, 0.2)',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        );
      })}
    </span>
  );
}
