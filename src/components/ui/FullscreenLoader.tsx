"use client";

import { motion } from 'motion/react';
import { useLoaderTheme } from '@/lib/theme';
import PraxisLoader from './PraxisLoader';

/** Fondo del loader según el tema: claro difuminado (logo con sus colores) u oscuro (logo en tonos claros). */
export const LOADER_BACKDROP = {
  light: 'bg-white/70 backdrop-blur-xl',
  dark: 'bg-[#0a0a0a]/85 backdrop-blur-xl',
} as const;

/** Loader institucional a pantalla completa para arranque de sesión, cambios de vista y carga de datos. */
export default function FullscreenLoader({ label = 'Cargando' }: { label?: string }) {
  const theme = useLoaderTheme();
  return (
    <motion.div
      className={`fixed inset-0 z-[85] flex items-center justify-center ${LOADER_BACKDROP[theme]}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
      transition={{ duration: 0.2 }}
      role="status"
      aria-live="polite"
    >
      <PraxisLoader size={125} label={label} inverse={theme === 'dark'} />
    </motion.div>
  );
}
