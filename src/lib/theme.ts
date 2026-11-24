"use client";

import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'praxis.tema';
const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'dark' || value === 'light') return value;
  } catch {
    // Sin almacenamiento: se usa la preferencia del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let current: Theme | null = null;

export function getTheme(): Theme {
  if (current === null) current = typeof window === 'undefined' ? 'light' : readStored();
  return current;
}

/** Pone o quita la clase .dark en <html>; el login y la recuperación no la usan. */
export function applyTheme(theme: Theme | null) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sin almacenamiento: el cambio dura hasta recargar.
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'light');
}

const AUTH_PATHS = ['/auth', '/login', '/recuperar-password', '/restablecer-password'];
const noop = () => () => {};
const onAuthPage = () => AUTH_PATHS.some((p) => window.location.pathname.startsWith(p));

/** Tema del loader: el login y la recuperación siempre son claros; dentro de la aplicación sigue el tema elegido. */
export function useLoaderTheme(): Theme {
  const theme = useTheme();
  const auth = useSyncExternalStore(noop, onAuthPage, () => true);
  return auth ? 'light' : theme;
}
