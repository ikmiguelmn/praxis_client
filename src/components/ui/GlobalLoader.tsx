"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import PraxisLoader from './PraxisLoader';
import { LOADER_BACKDROP } from './FullscreenLoader';
import { useLoaderTheme } from '@/lib/theme';

/** Tiempo mínimo para que la animación del logo se alcance a ver al abrir la aplicación. */
const MIN_VISIBLE_MS = 700;

/**
 * Loader de arranque: cubre la pantalla hasta que la página está lista en el navegador y las fuentes cargaron.
 * La espera por los datos de cada vista la maneja PageLoader.
 */
export default function GlobalLoader() {
  const [loading, setLoading] = useState(true);
  const theme = useLoaderTheme();

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void fonts.then(() => {
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - started));
      setTimeout(() => !cancelled && setLoading(false), wait);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="global-loader"
          className={`fixed inset-0 z-[9999] flex items-center justify-center ${LOADER_BACKDROP[theme]}`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
          role="status"
          aria-label="Cargando PRAXIS"
        >
          <PraxisLoader size={117} inverse={theme === 'dark'} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
