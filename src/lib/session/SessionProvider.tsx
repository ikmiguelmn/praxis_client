"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import { forgetDevice, sessionShouldEnd } from './rememberDevice';
import { onSessionChange, setActiveRoleHeader } from '@/services/api';
import { apiStatus } from '@/lib/apiError';
import type { MenuItem, Profile, RoleCode, SessionResponse } from '@/types/auth';

/** unreachable: no se pudo contactar al servidor; la sesión no se da por cerrada. */
type Status = 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'unreachable';

interface SessionContextValue {
  status: Status;
  profile: Profile | null;
  menu: MenuItem[];
  activeRole: RoleCode | null;
  /** true cuando el usuario cerró sesión a propósito (no por vencimiento). */
  signedOut: boolean;
  /** Recupera la sesión desde la cookie de refresh si todavía no hay una en memoria. */
  ensureSession: () => Promise<boolean>;
  /** Vuelve a intentar recuperar la sesión cuando el servidor no respondió. */
  retrySession: () => void;
  /** Guarda la sesión recién iniciada en el login. */
  startSession: (session: SessionResponse) => Promise<void>;
  /** Cambia el rol activo y recarga perfil y menú según la matriz D09. */
  switchRole: (role: RoleCode) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Error de red o del servidor (5xx): no dice nada sobre si la sesión sigue vigente. */
function isServerUnavailable(err: unknown): boolean {
  const status = apiStatus(err);
  return status === null || status >= 500;
}

/** Recupera la sesión reintentando unas veces si el servidor no responde (por ejemplo, mientras arranca). */
async function restoreWithRetry(): ReturnType<typeof authService.restore> {
  const waits = [800, 2000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await authService.restore();
    } catch (err) {
      if (!isServerUnavailable(err) || attempt >= waits.length) throw err;
      await new Promise((resolve) => setTimeout(resolve, waits[attempt]));
    }
  }
}
const ROLE_STORAGE_KEY = 'praxis.rol-activo';

function readStoredRole(): RoleCode | null {
  try {
    return (sessionStorage.getItem(ROLE_STORAGE_KEY) as RoleCode | null) ?? null;
  } catch {
    return null;
  }
}

function storeRole(role: RoleCode | null): void {
  try {
    if (role) sessionStorage.setItem(ROLE_STORAGE_KEY, role);
    else sessionStorage.removeItem(ROLE_STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible: el rol vuelve al predeterminado al recargar.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeRole, setActiveRole] = useState<RoleCode | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const pending = useRef<Promise<boolean> | null>(null);

  /** Aplica el rol preferido si el usuario lo tiene; si no, el que indique el backend. */
  const hydrate = useCallback(async (base: Profile) => {
    const stored = readStoredRole();
    const preferred = stored && base.roles.some((r) => r.codigo === stored) ? stored : base.rol_activo?.codigo ?? null;

    setActiveRoleHeader(preferred);
    const current = preferred && preferred !== base.rol_activo?.codigo ? await authService.me() : base;
    const items = await authService.menu();

    storeRole(current.rol_activo?.codigo ?? null);
    setProfile(current);
    setActiveRole(current.rol_activo?.codigo ?? null);
    setMenu(items);
    setStatus('authenticated');
    return current;
  }, []);

  const ensureSession = useCallback(async () => {
    if (status === 'authenticated') return true;
    if (pending.current) return pending.current;

    setStatus('loading');
    // Sin "Recordar en este equipo": al volver a abrir el navegador se cierra la sesión en el servidor
    // en lugar de restaurarla con la cookie de refresh.
    if (sessionShouldEnd()) {
      pending.current = authService
        .logout()
        .catch(() => undefined)
        .then(() => {
          setStatus('anonymous');
          return false;
        })
        .finally(() => {
          pending.current = null;
        });
      return pending.current;
    }
    pending.current = restoreWithRetry()
      .then(async ({ usuario }) => {
        await hydrate(usuario);
        return true;
      })
      .catch((err) => {
        // Sin cookie válida (4xx) no hay sesión; si el servidor no respondió, se ofrece reintentar
        // en lugar de mandar al login (recargar con el backend caído ya no cierra la sesión).
        setStatus(isServerUnavailable(err) ? 'unreachable' : 'anonymous');
        return false;
      })
      .finally(() => {
        pending.current = null;
      });

    return pending.current;
  }, [status, hydrate]);

  const retrySession = useCallback(() => setStatus('idle'), []);

  const startSession = useCallback(
    async (session: SessionResponse) => {
      storeRole(null);
      setSignedOut(false);
      await hydrate(session.usuario);
    },
    [hydrate],
  );

  const switchRole = useCallback(async (role: RoleCode) => {
    setActiveRoleHeader(role);
    const [current, items] = await Promise.all([authService.me(), authService.menu()]);
    storeRole(role);
    setProfile(current);
    setActiveRole(role);
    setMenu(items);
    return current;
  }, []);

  const signOut = useCallback(async () => {
    setSignedOut(true);
    forgetDevice();
    try {
      await authService.logout();
    } finally {
      storeRole(null);
      setActiveRoleHeader(null);
      setProfile(null);
      setMenu([]);
      setActiveRole(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(
    () =>
      onSessionChange((event) => {
        if (event.type === 'expired') {
          setStatus('anonymous');
          setProfile(null);
        }
      }),
    [],
  );

  const value = useMemo(
    () => ({ status, profile, menu, activeRole, signedOut, ensureSession, retrySession, startSession, switchRole, signOut }),
    [status, profile, menu, activeRole, signedOut, ensureSession, retrySession, startSession, switchRole, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  return context;
}

/** Nivel de acceso del rol activo a un módulo de la matriz D09, o null si no lo tiene. */
export function useModuleAccess(codigo: string) {
  const { menu, profile } = useSession();
  return (
    menu.find((item) => item.codigo === codigo)?.nivel_acceso ??
    profile?.permisos.find((p) => p.modulo === codigo)?.nivel_acceso ??
    null
  );
}
