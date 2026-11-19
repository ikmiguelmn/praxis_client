"use client";

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { usePageLoadCount } from '@/lib/pageLoading';
import FullscreenLoader from './FullscreenLoader';

/** Tiempo mínimo en pantalla para que el loader no parpadee en cargas muy rápidas. */
const MIN_VISIBLE_MS = 450;
/** Margen antes de ocultarlo, por si una consulta empieza justo cuando termina la anterior. */
const SETTLE_MS = 160;

/**
 * Loader a pantalla completa mientras la página carga sus datos de la base de datos.
 * Se mantiene visible hasta que terminan todas las consultas iniciales de la vista.
 */
export default function PageLoader() {
  const pending = usePageLoadCount();
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (pending > 0) {
      const timer = setTimeout(() => {
        if (!shownAt.current) shownAt.current = Date.now();
        setVisible(true);
      }, 0);
      return () => clearTimeout(timer);
    }
    const elapsed = shownAt.current ? Date.now() - shownAt.current : MIN_VISIBLE_MS;
    const timer = setTimeout(() => {
      shownAt.current = 0;
      setVisible(false);
    }, Math.max(SETTLE_MS, MIN_VISIBLE_MS - elapsed));
    return () => clearTimeout(timer);
  }, [pending]);

  return <AnimatePresence>{visible && <FullscreenLoader key="page-loader" label="Cargando información" />}</AnimatePresence>;
}
