'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useSceneStore } from '@/store/scene-store';
import { LogoMark } from './Logo';

const MIN_DURATION_MS = 1_500;
/** Never keep the user waiting on the GPU: after this long, show the app regardless. */
const GIVE_UP_MS = 8_000;
const INTRO_MS = 3_200;

const TIPS = [
  'Your money stays in escrow until you confirm delivery.',
  'Drag a product to turn it. Scroll to zoom.',
  'Arrow keys browse the showroom. Enter buys.',
] as const;

export function Preloader() {
  const phase = useSceneStore((state) => state.phase);
  const setPhase = useSceneStore((state) => state.setPhase);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    let introTimer = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const ready = useSceneStore.getState().sceneReady || elapsed > GIVE_UP_MS;
      // Hold just short of done until the scene has actually painted.
      const value = Math.min(ready ? 100 : 88, (elapsed / MIN_DURATION_MS) * 100);
      setProgress((current) => Math.max(current, Math.round(value)));

      if (value >= 100) {
        setPhase('intro');
        introTimer = window.setTimeout(() => setPhase('ready'), INTRO_MS);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(introTimer);
    };
  }, [setPhase]);

  return (
    <AnimatePresence>
      {phase === 'loading' && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-[60] flex flex-col justify-between bg-ink-950 p-6 lg:p-10"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
          role="status"
          aria-label="Loading DacitySwap"
        >
          <div className="flex items-center gap-3 text-sm text-white/55">
            <LogoMark size={26} />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase">DacitySwap</span>
          </div>

          <div>
            <div className="flex items-end justify-between">
              <p className="max-w-[26rem] text-sm leading-relaxed text-white/60">
                <span className="label mr-2 text-[10px] text-white/90">Tip</span>
                {TIPS[Math.min(TIPS.length - 1, Math.floor(progress / 34))]}
              </p>
              <p className="font-hud text-gradient text-[clamp(5rem,16vw,13rem)] leading-[0.8] tabular-nums">
                {String(progress).padStart(3, '0')}
              </p>
            </div>
            <div className="mt-6 h-px w-full bg-white/10">
              <div
                className="bg-accent-fill h-px origin-left transition-transform duration-200 ease-out"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
