"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullscreenLoader from '@/components/ui/FullscreenLoader';
import { useSession } from '@/lib/session/SessionProvider';
import { mayHaveSession } from '@/lib/session/rememberDevice';

/** Solo se aceptan rutas internas como deep-link. */
function safeReturnUrl(value: string | null): string | undefined {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}

// Se mira una sola vez, al abrir la página: después del ingreso con el formulario no debe volver a aplicar.
let savedAtOpen: boolean | null = null;
const noopSubscribe = () => () => {};
const readSavedAtOpen = () => (savedAtOpen ??= mayHaveSession());

/**
 * Al abrir el login con una sesión guardada en este equipo ("Recordar en este equipo", o el navegador
 * sigue abierto), entra directo a la aplicación en lugar de pedir otra vez las credenciales.
 */
export default function ResumeSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { status, profile, ensureSession } = useSession();
  const saved = useSyncExternalStore(noopSubscribe, readSavedAtOpen, () => false);
  // Tras una sesión vencida o un cambio de contraseña se muestra el formulario.
  const skip = params.get('sesion') === 'expirada' || params.has('restablecida');
  const checking = saved && !skip && (status === 'idle' || status === 'loading' || status === 'authenticated');

  useEffect(() => {
    if (checking && status === 'idle') void ensureSession();
  }, [checking, status, ensureSession]);

  useEffect(() => {
    if (!checking || status !== 'authenticated' || !profile) return;
    window.scrollTo({ top: 0 });
    router.replace(safeReturnUrl(params.get('returnUrl')) ?? profile.ruta_inicio ?? '/panel');
  }, [checking, status, profile, params, router]);

  if (checking) return <FullscreenLoader label="Verificando sesión" />;
  return <>{children}</>;
}
