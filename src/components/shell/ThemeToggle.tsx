"use client";

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '@/lib/theme';

/** Botón de la barra superior para cambiar entre modo claro y oscuro. */
export default function ThemeToggle() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const dark = theme === 'dark';
  const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      aria-pressed={dark}
      className="relative flex h-10 w-10 shrink-0 sm:h-11 sm:w-11 items-center justify-center overflow-hidden rounded-xl border border-praxis-line bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="flex"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.4, y: 8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.4, y: -8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        >
          {dark ? <Moon className="h-[18px] w-[18px] text-sky-300" aria-hidden="true" /> : <Sun className="h-[18px] w-[18px] text-amber-500" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
