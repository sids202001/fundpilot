'use client';

import React from 'react';

/**
 * Purely visual background ambient glow layer (charcoal + champagne gold).
 * 3D card tilt and spotlighting are handled directly by SpatialDepthCard and TiltCard.
 */
export function PortfolioDepthEffect() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />
      <div className="ambient-orb-3" />
      <div className="ambient-vignette" />
    </div>
  );
}
