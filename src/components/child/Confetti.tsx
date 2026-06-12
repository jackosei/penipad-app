/**
 * A one-shot confetti burst for the Done celebration (F1.12). Pure CSS
 * animation, no library, no canvas. Self-removes after the animation. The
 * caller remounts it (via a changing key) to fire a new burst. Respects
 * prefers-reduced-motion at the call site (the burst simply isn't rendered).
 */
import { useEffect, useMemo, useState, type CSSProperties, type JSX } from 'react';
import { INK_PALETTE } from '@/constants';

const PARTICLE_COUNT = 28;
const DURATION_MS = 1500;

type Particle = {
  left: number;
  hue: string;
  delay: number;
  drift: number;
  spin: number;
  size: number;
};

function buildParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    left: Math.random() * 100,
    hue: INK_PALETTE[Math.floor(Math.random() * INK_PALETTE.length)] ?? '#FF4757',
    delay: Math.random() * 200,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() - 0.5) * 720,
    size: 8 + Math.random() * 8,
  }));
}

export function Confetti(): JSX.Element | null {
  const particles = useMemo(buildParticles, []);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setGone(true), DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  if (gone) return null;

  return (
    <div className="confetti" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className="confetti__piece"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.hue,
              animationDelay: `${p.delay}ms`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
