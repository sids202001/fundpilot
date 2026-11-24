'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true ONLY when the user has a fine pointer (mouse/trackpad)
 * AND has not requested reduced motion.
 * Automatically disables all 3D pointer effects on touch devices and reduced-motion setups.
 */
export function usePointer3D(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerMq = window.matchMedia('(pointer: fine)');

    const update = () => {
      setEnabled(!reducedMotionMq.matches && finePointerMq.matches);
    };

    update();
    reducedMotionMq.addEventListener('change', update);
    finePointerMq.addEventListener('change', update);

    return () => {
      reducedMotionMq.removeEventListener('change', update);
      finePointerMq.removeEventListener('change', update);
    };
  }, []);

  return enabled;
}
