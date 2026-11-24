"use client";

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import type { AccessLevel } from '@/types/auth';
import { useSession } from './SessionProvider';

interface RequireModuleProps {
  /** Códigos de módulo D09; basta con que el rol activo tenga uno. */
  modules: string[];
  children: ReactNode | ((access: AccessLevel) => ReactNode);
}

const RANK: Record<AccessLevel, number> = { TOTAL: 3, ASIGNADAS: 2, LECTURA: 1 };

/** Segundos que se muestra el aviso antes de llevar a la persona a su inicio (BUG-0007, KAN-301 E5). */
const REDIRECT_SECONDS = 3;

/** Muestra la vista solo si el rol activo tiene acceso a alguno de los módulos (RoleGuard, HU-1.3). */
export default function RequireModule({ modules, children }: RequireModuleProps) {
  const router = useRouter();
  const { menu, profile, activeRole } = useSession();

  const levels = modules
    .map((code) => menu.find((item) => item.codigo === code)?.nivel_acceso ?? profile?.permisos.find((p) => p.modulo === code)?.nivel_acceso)
    .filter((level): level is AccessLevel => Boolean(level));
  const denied = levels.length === 0;
  const home = profile?.ruta_inicio ?? '/panel';
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  // Sin acceso: se muestra el aviso y, tras una pausa corta para leerlo, se lleva a la página de inicio del rol
  // (para el reportante, /mis-solicitudes).
  useEffect(() => {
    if (!denied) return;
    const tick = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    const leave = setTimeout(() => router.replace(home), REDIRECT_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(leave);
    };
  }, [denied, home, router]);

  if (denied) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center" role="alert">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900">Esta sección no está disponible para tu rol</h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Con el rol {profile?.rol_activo?.nombre ?? activeRole} no tienes acceso a esta vista. Si tienes otro rol asignado, cámbialo desde tu perfil.
        </p>
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          Te llevamos a tu inicio en <span className="tabular-nums">{seconds}</span> s…
        </p>
        <Link href={home} replace className="btn-dark px-5 py-3">
          Ir a mi inicio ahora
        </Link>
      </div>
    );
  }

  const best = levels.sort((a, b) => RANK[b] - RANK[a])[0];
  return <>{typeof children === 'function' ? children(best) : children}</>;
}
