"use client";

import { useSyncExternalStore } from 'react';

/**
 * Registro global de cargas que bloquean la vista: mientras haya al menos una consulta de la página
 * cargando sus datos por primera vez, el loader a pantalla completa sigue visible.
 */
const active = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function startPageLoad(id: string) {
  if (active.has(id)) return;
  active.add(id);
  emit();
}

export function endPageLoad(id: string) {
  if (!active.delete(id)) return;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Número de consultas de la página que todavía no han traído sus datos. */
export function usePageLoadCount(): number {
  return useSyncExternalStore(subscribe, () => active.size, () => 0);
}
