"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, FileText, ImageOff, Loader2, RotateCw, X } from 'lucide-react';
import type { EvidenciaDetalle } from '@/types/incident';
import { formatDateTime } from '@/lib/format';

const STAGE_LABELS: Record<string, string> = {
  REPORTE: 'Reporte',
  ACLARACION: 'Aclaración',
  INSPECCION: 'Inspección',
  EJECUCION: 'Ejecución',
  VERIFICACION: 'Verificación',
};

/** Las URLs firmadas vencen a los ~30 min: se renuevan un poco antes al volver a la página. */
const RENEW_AFTER_MS = 25 * 60 * 1000;

type ImageState = 'loading' | 'ok' | 'error';

/**
 * Imagen de evidencia con estados de carga y error. Si el enlace firmado falla (vencido o rechazado) pide
 * enlaces nuevos una vez; si aun así no carga, muestra un aviso con "Reintentar" en lugar del ícono roto.
 */
function EvidenceImage({
  src,
  alt,
  className,
  onBroken,
  onRetry,
  dark = false,
}: {
  src: string;
  alt: string;
  className: string;
  /** Primer fallo con este enlace: devuelve true si se están pidiendo enlaces nuevos. */
  onBroken: (src: string) => boolean;
  onRetry?: () => void;
  dark?: boolean;
}) {
  const [state, setState] = useState<{ src: string; value: ImageState }>({ src, value: 'loading' });
  const current: ImageState = state.src === src ? state.value : 'loading';

  // Mientras llegan enlaces nuevos se sigue mostrando "cargando"; si no hay cómo renovar, se avisa.
  const fail = () => {
    if (!onBroken(src)) setState({ src, value: 'error' });
  };

  // El error o la carga pudieron ocurrir antes de que React escuchara el evento (imagen en caché o respuesta
  // muy rápida): se revisa el estado real de la imagen al montarla.
  const check = (img: HTMLImageElement | null) => {
    if (!img?.complete || state.src === src && state.value !== 'loading') return;
    if (img.naturalWidth > 0) setState({ src, value: 'ok' });
    else if (img.currentSrc) fail();
  };

  // En el visor el aviso va en una tarjeta clara sobre el fondo oscuro; en la miniatura deja libre la franja
  // inferior donde va la etapa.
  const tone = dark ? 'text-white' : 'text-slate-500';
  const errorBox = dark ? 'm-auto h-fit w-fit rounded-2xl bg-white/10 px-8 py-6 gap-2' : 'pb-6 gap-1';
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={check}
        src={src}
        alt={alt}
        onLoad={() => setState({ src, value: 'ok' })}
        onError={fail}
        className={`${className} ${current === 'ok' ? '' : 'invisible'}`}
      />
      {current === 'loading' && (
        <span className={`absolute inset-0 flex items-center justify-center ${tone}`} aria-hidden="true">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
      )}
      {current === 'error' && (
        <span className={`absolute inset-0 flex flex-col items-center justify-center px-2 text-center ${tone} ${errorBox}`} role="status">
          <ImageOff className={dark ? 'h-7 w-7' : 'h-5 w-5'} aria-hidden="true" />
          <span className={`font-semibold leading-tight ${dark ? 'whitespace-nowrap text-sm' : 'text-[10px]'}`}>{dark ? 'No se pudo cargar la imagen' : 'No se pudo cargar'}</span>
          {onRetry && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRetry();
                }
              }}
              className={`inline-flex items-center gap-1 rounded-md font-bold underline-offset-2 hover:underline ${dark ? "mt-1 bg-white px-3 py-1.5 text-xs text-[#0B1B3A] hover:no-underline hover:bg-sky-50" : "px-1.5 py-0.5 text-[10px] text-praxis-blue"}`}
            >
              <RotateCw className="h-3 w-3" aria-hidden="true" />
              Reintentar
            </span>
          )}
        </span>
      )}
    </>
  );
}

/** Miniaturas de evidencias con visor ampliado (lightbox) y navegación con teclado. */
export default function EvidenceGallery({
  items,
  emptyText = 'Sin evidencias adjuntas.',
  onExpired,
}: {
  items: EvidenciaDetalle[];
  emptyText?: string;
  /** Las URLs firmadas vencen (~30 min): si una imagen deja de cargar se piden datos nuevos. */
  onExpired?: () => Promise<unknown> | void;
}) {
  const [index, setIndex] = useState<number | null>(null);
  // Cambia tras cada renovación para volver a montar las imágenes: si el servidor devolvió el mismo enlace
  // (misma hora o respuesta en caché) el navegador no lo volvería a pedir por sí solo.
  const [attempt, setAttempt] = useState(0);
  const renewed = useRef(new Set<string>());
  const onExpiredRef = useRef(onExpired);
  const receivedAt = useRef(0);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  });

  const renew = async () => {
    try {
      await onExpiredRef.current?.();
    } finally {
      setAttempt((n) => n + 1);
    }
  };

  /** Primer fallo de un enlace: se piden enlaces nuevos (una vez por enlace). */
  const handleBroken = (url: string) => {
    if (!onExpiredRef.current || renewed.current.has(url)) return false;
    renewed.current.add(url);
    void renew();
    return true;
  };
  const retry = onExpired ? () => void renew() : undefined;

  // Al volver a la pestaña (o a una página que Next conservó) con enlaces viejos, se renuevan antes de que fallen.
  useEffect(() => {
    receivedAt.current = Date.now();
  }, [items]);
  useEffect(() => {
    const renewIfOld = () => {
      if (document.visibilityState !== 'visible' || !receivedAt.current) return;
      if (Date.now() - receivedAt.current < RENEW_AFTER_MS) return;
      receivedAt.current = Date.now();
      onExpiredRef.current?.();
    };
    document.addEventListener('visibilitychange', renewIfOld);
    window.addEventListener('focus', renewIfOld);
    window.addEventListener('pageshow', renewIfOld);
    return () => {
      document.removeEventListener('visibilitychange', renewIfOld);
      window.removeEventListener('focus', renewIfOld);
      window.removeEventListener('pageshow', renewIfOld);
    };
  }, []);
  const images = items.filter((e) => e.mime_type.startsWith('image/'));
  const current = index !== null ? images[index] : null;

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIndex(null);
      if (event.key === 'ArrowRight') setIndex((i) => (i === null ? i : (i + 1) % images.length));
      if (event.key === 'ArrowLeft') setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, images.length]);

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <ImageOff className="h-4 w-4" aria-hidden="true" />
        {emptyText}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-wrap gap-3">
        {items.map((ev) => {
          const imageIndex = images.indexOf(ev);
          return (
            <li key={ev.id}>
              {imageIndex >= 0 ? (
                <button
                  type="button"
                  onClick={() => setIndex(imageIndex)}
                  className="group relative block h-28 w-28 overflow-hidden rounded-xl border border-praxis-line bg-slate-100"
                  aria-label={`Ver ${ev.nombre_original}`}
                >
                  <EvidenceImage key={attempt} src={ev.url} alt="" onBroken={handleBroken} onRetry={retry} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-2 pb-1.5 pt-4 text-left text-[10px] font-semibold text-white">
                    {STAGE_LABELS[ev.etapa] ?? ev.etapa}
                  </span>
                </button>
              ) : (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-xl border border-praxis-line bg-slate-50 px-2 text-center text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  <FileText className="h-7 w-7 text-slate-400" aria-hidden="true" />
                  <span className="line-clamp-2">{ev.nombre_original}</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {current && (
              <motion.div
                className="fixed inset-0 z-[90] flex flex-col bg-slate-950/90 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
                aria-label="Visor de evidencias"
              >
                <div className="flex items-center justify-between gap-4 px-5 py-4 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{current.nombre_original}</p>
                    <p className="text-xs text-slate-400">
                      {STAGE_LABELS[current.etapa] ?? current.etapa} · {formatDateTime(current.fecha_carga)}
                      {current.usuario_carga ? ` · ${current.usuario_carga.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={current.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 hover:bg-white/10" aria-label="Abrir original">
                      <Download className="h-5 w-5" aria-hidden="true" />
                    </a>
                    <button type="button" onClick={() => setIndex(null)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar visor">
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="relative flex flex-1 items-center justify-center px-14 pb-10" onClick={() => setIndex(null)}>
                  <motion.div
                    key={current.id}
                    className="relative flex h-full w-full items-center justify-center"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <span className="relative flex min-h-40 min-w-40 max-h-full max-w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <EvidenceImage
                        key={attempt}
                        src={current.url}
                        alt={current.nombre_original}
                        onBroken={handleBroken}
                        onRetry={retry}
                        dark
                        className="max-h-[calc(100vh-9rem)] max-w-full rounded-xl object-contain shadow-2xl"
                      />
                    </span>
                  </motion.div>
                  {images.length > 1 && (
                    <>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setIndex((i) => ((i ?? 0) - 1 + images.length) % images.length); }} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Anterior">
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setIndex((i) => ((i ?? 0) + 1) % images.length); }} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Siguiente">
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
