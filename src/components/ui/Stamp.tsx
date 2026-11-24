"use client";

import { motion, useReducedMotion } from 'motion/react';

export type StampTone = 'red' | 'green' | 'amber' | 'sky' | 'slate';

const TONES: Record<StampTone, string> = {
  red: 'border-red-600 text-red-600',
  green: 'border-emerald-600 text-emerald-600',
  amber: 'border-amber-600 text-amber-600',
  sky: 'border-sky-600 text-sky-600',
  slate: 'border-slate-500 text-slate-500',
};

/** Sello de goma para marcar hitos (Cancelada, Cerrada, Radicada…) en fichas y trazabilidades. */
export default function Stamp({ label, tone, detail, size = 'sm', animate = true, className = '' }: { label: string; tone: StampTone; detail?: string; size?: 'sm' | 'lg'; animate?: boolean; className?: string }) {
  const reduceMotion = useReducedMotion();
  const big = size === 'lg';
  return (
    <motion.span
      aria-label={`Sello: ${label}`}
      role="img"
      className={`inline-flex select-none flex-col items-center rounded-lg border-[2.5px] text-center uppercase opacity-90 stamp-ink ${TONES[tone]} ${big ? 'px-4 py-1.5' : 'px-2 py-0.5'} ${className}`}
      style={{ rotate: big ? -10 : -6 }}
      initial={animate && !reduceMotion ? { opacity: 0, scale: 2.2 } : false}
      animate={{ opacity: 0.9, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.5, 0, 0.75, 0] }}
    >
      <span className={`font-black leading-none tracking-[0.08em] ${big ? 'text-lg' : 'text-[10px]'}`}>{label}</span>
      {detail && <span className={`mt-0.5 border-t-2 border-current pt-0.5 font-bold normal-case tabular-nums ${big ? 'text-[11px]' : 'text-[9px]'}`}>{detail}</span>}
    </motion.span>
  );
}

/** Sello que corresponde a un estado o evento, si lo tiene. */
export function stampFor(stateCode?: string | null, eventType?: string | null): { label: string; tone: StampTone } | null {
  if (eventType === 'REAPERTURA') return { label: 'Reabierta', tone: 'sky' };
  switch (stateCode) {
    case 'E01':
      return eventType === 'CREACION' || !eventType ? { label: 'Radicada', tone: 'sky' } : null;
    case 'E15':
      return { label: 'Cerrada', tone: 'green' };
    case 'E16':
      return { label: 'No procedente', tone: 'slate' };
    case 'E17':
      return { label: 'Cancelada', tone: 'red' };
    case 'E18':
      return { label: 'Suspendida', tone: 'amber' };
    default:
      return null;
  }
}
