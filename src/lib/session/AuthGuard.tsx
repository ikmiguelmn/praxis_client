"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CloudOff, RotateCw } from 'lucide-react';
import FullscreenLoader from '@/components/ui/FullscreenLoader';
import { useSession } from './SessionProvider';

/**
 * Protege las vistas internas (HU-1.1): recupera la sesión desde la cookie de refresh y,
 * si no hay sesión, envía al login conservando la ruta pedida como deep-link.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, signedOut, ensureSession, retrySession } = useSession();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (status === 'idle') void ensureSession();
    if (status === 'authenticated') wasAuthenticated.current = true;
    if (status === 'anonymous') {
      // Cierre de sesión voluntario: login limpio, sin deep-link ni aviso de sesión vencida.
      if (signedOut) {
        router.replace('/auth/login');
        return;
      }
      // Se conserva la consulta (filtros, pestañas) además de la ruta para volver exactamente al mismo lugar.
      const params = new URLSearchParams({ returnUrl: `${pathname}${window.location.search}` });
      if (wasAuthenticated.current) params.set('sesion', 'expirada');
      router.replace(`/auth/login?${params.toString()}`);
    }
  }, [status, signedOut, ensureSession, pathname, router]);

  // El servidor no respondió al recuperar la sesión: se conserva y se ofrece reintentar.
  if (status === 'unreachable') {
    return (
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#0D111D] px-6 text-center" role="alert">
        <div className="max-w-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
            <CloudOff className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-white">No pudimos conectar con el servidor</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Tu sesión sigue guardada en este navegador. Revisa tu conexión o espera a que el servicio vuelva a estar disponible.
          </p>
          <button
            type="button"
            onClick={retrySession}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B1B3A] transition hover:bg-sky-50"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') return <FullscreenLoader label="Verificando sesión" />;

  return <>{children}</>;
}
