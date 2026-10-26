'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useInView, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Bee — a tiny flapping bee. Wings beat, body bobs.                   */
/* ------------------------------------------------------------------ */
export function Bee({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 72 56"
      className={cn('w-14 h-11 drop-shadow-sm', className)}
      style={{ scaleX: flip ? -1 : 1 }}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      {/* wings */}
      <motion.ellipse
        cx="30" cy="14" rx="11" ry="15" fill="#ffffff" fillOpacity="0.85" stroke="#e7d5a8" strokeWidth="1.2"
        style={{ originX: '30px', originY: '24px' }}
        animate={{ rotate: [-28, 8, -28] }}
        transition={{ duration: 0.16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.ellipse
        cx="43" cy="14" rx="9" ry="13" fill="#ffffff" fillOpacity="0.7" stroke="#e7d5a8" strokeWidth="1.2"
        style={{ originX: '43px', originY: '24px' }}
        animate={{ rotate: [22, -10, 22] }}
        transition={{ duration: 0.16, repeat: Infinity, ease: 'easeInOut', delay: 0.05 }}
      />
      {/* body */}
      <ellipse cx="38" cy="34" rx="22" ry="15" fill="#f59e0b" />
      <path d="M30 20c4 6 4 22 0 28" stroke="#1e293b" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M43 20c4 6 4 22 0 28" stroke="#1e293b" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      {/* stinger */}
      <path d="M59 34l7 2-7 2z" fill="#1e293b" />
      {/* head */}
      <circle cx="16" cy="33" r="10" fill="#fbbf24" />
      <circle cx="13" cy="31" r="2.6" fill="#1e293b" />
      <circle cx="12.2" cy="30.2" r="0.9" fill="#fff" />
      <path d="M12 37q3 3 6 0" stroke="#1e293b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* antennae */}
      <path d="M12 24q-3-7-7-8M19 24q1-8 6-10" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </motion.svg>
  );
}

/** A bee that loops across its container along a lazy figure-eight. Click it for a spin. */
export function FlyingBee({ className, onClick }: { className?: string; onClick?: () => void }) {
  const [spin, setSpin] = useState(0);
  return (
    <motion.div
      className={cn('absolute cursor-pointer select-none z-20', className)}
      initial={{ x: -80, y: 20, rotate: 0 }}
      animate={{
        x: [-80, 120, 320, 220, 60, -80],
        y: [20, -30, 10, 70, 40, 20],
        rotate: [0, -8, 6, 10, -6, 0],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      onClick={() => {
        setSpin((s) => s + 1);
        onClick?.();
      }}
      role="img"
      aria-label="A friendly bee. Click for a surprise."
    >
      <motion.div
        key={spin}
        animate={spin ? { rotate: [0, 360], scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <Bee />
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* HexDrift — slow floating honeycomb cells behind content.            */
/* ------------------------------------------------------------------ */
const HEXES = [
  { x: '6%', y: '14%', s: 56, d: 9, o: 0.5 },
  { x: '18%', y: '70%', s: 34, d: 12, o: 0.4 },
  { x: '42%', y: '8%', s: 28, d: 10, o: 0.35 },
  { x: '58%', y: '82%', s: 64, d: 14, o: 0.3 },
  { x: '78%', y: '12%', s: 44, d: 11, o: 0.45 },
  { x: '92%', y: '56%', s: 30, d: 13, o: 0.4 },
  { x: '34%', y: '44%', s: 22, d: 8, o: 0.3 },
  { x: '68%', y: '38%', s: 26, d: 15, o: 0.25 },
];

export function HexDrift({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {HEXES.map((h, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 100"
          className="absolute"
          style={{ left: h.x, top: h.y, width: h.s, height: h.s, opacity: h.o }}
          animate={{ y: [0, -26, 0], rotate: [0, i % 2 ? 24 : -24, 0] }}
          transition={{ duration: h.d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        >
          <polygon
            points="50,4 91,27 91,73 50,96 9,73 9,27"
            fill={i % 3 === 0 ? '#fbbf24' : 'none'}
            fillOpacity={i % 3 === 0 ? 0.35 : 0}
            stroke="#f59e0b"
            strokeWidth="3"
          />
        </motion.svg>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confetti — honeycomb-coloured burst. Call fire() to trigger.        */
/* ------------------------------------------------------------------ */
const COLORS = ['#f59e0b', '#fbbf24', '#fde68a', '#1e293b', '#6366f1', '#fb7185'];

type Piece = { id: number; dx: number; dy: number; rot: number; size: number; color: string; shape: 'hex' | 'dot' | 'bar' };

export function useConfetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const idRef = useRef(0);

  const fire = useCallback((count = 46) => {
    const batch: Piece[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const power = 160 + Math.random() * 300;
      return {
        id: idRef.current++,
        dx: Math.cos(angle) * power,
        dy: Math.sin(angle) * power - 120,
        rot: (Math.random() - 0.5) * 900,
        size: 8 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: (['hex', 'dot', 'bar'] as const)[Math.floor(Math.random() * 3)],
      };
    });
    setPieces((p) => [...p, ...batch]);
    window.setTimeout(() => setPieces((p) => p.filter((x) => !batch.includes(x))), 1800);
  }, []);

  const node = (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-[45%]"
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.dx, y: [0, p.dy, p.dy + 380], scale: [0, 1, 1], rotate: p.rot, opacity: [1, 1, 0] }}
          transition={{ duration: 1.6, ease: 'easeOut', times: [0, 0.4, 1] }}
          style={{
            width: p.shape === 'bar' ? p.size * 0.5 : p.size,
            height: p.shape === 'bar' ? p.size * 1.6 : p.size,
            background: p.color,
            borderRadius: p.shape === 'dot' ? '9999px' : p.shape === 'bar' ? 2 : 0,
            clipPath: p.shape === 'hex' ? 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' : undefined,
          }}
        />
      ))}
    </div>
  );

  return { fire, node };
}

/* ------------------------------------------------------------------ */
/* CountUp — numbers that tick up when they scroll into view.          */
/* ------------------------------------------------------------------ */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {inView ? display : 0}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* HiveLoader — three cells pulsing in turn. Replaces plain spinners.  */
/* ------------------------------------------------------------------ */
export function HiveLoader({ label }: { label?: string }) {
  const cells = [
    { x: 0, y: 0 },
    { x: 26, y: 0 },
    { x: 13, y: 22 },
  ];
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="relative w-14 h-14">
        {cells.map((c, i) => (
          <motion.svg
            key={i}
            viewBox="0 0 100 100"
            className="absolute w-7 h-7"
            style={{ left: c.x, top: c.y + 6 }}
            animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.45, 1, 0.45], rotate: [0, 30, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          >
            <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="#f59e0b" />
          </motion.svg>
        ))}
      </div>
      <span className="sr-only">{label || 'Loading'}</span>
      {label && <p className="text-sm font-medium text-slate-600">{label}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stagger helpers for lists.                                          */
/* ------------------------------------------------------------------ */
export const listItem = (i: number) => ({
  initial: { opacity: 0, y: 28, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay: Math.min(i, 8) * 0.06 },
});

/** Little burst of dots around an element, used by the like button. */
export function Burst({ show }: { show: boolean }) {
  const dots = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);
  return (
    <AnimatePresence>
      {show && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
          {dots.map((a, i) => (
            <motion.span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-rose-400"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos(a) * 20, y: Math.sin(a) * 20, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            />
          ))}
        </span>
      )}
    </AnimatePresence>
  );
}
