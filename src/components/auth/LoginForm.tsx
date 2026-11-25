"use client";

import { useState, useSyncExternalStore } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AtSign } from 'lucide-react';
import { authService } from '@/services/authService';
import { useSession } from '@/lib/session/SessionProvider';
import { apiErrorMessage, apiFieldErrors } from '@/lib/apiError';
import { AuthError, AuthField, AuthItem, AuthSubmit } from './AuthMotion';
import PasswordField from './recovery/PasswordField';
import { deviceIsRemembered, rememberDevice, rememberedEmail } from '@/lib/session/rememberDevice';
import { stopResuming } from './ResumeSession';

const noopSubscribe = () => () => {};

/** Solo se aceptan rutas internas como deep-link (HU-1.1). */
function returnUrlFromLocation(): string | undefined {
  const value = new URLSearchParams(window.location.search).get('returnUrl');
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}

/** Cuenta bloqueada por intentos fallidos (423): se indica cuánto falta para volver a intentar (HU-11.4). */
function lockoutMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 423) return null;
  const until = (err.response.data as { bloqueado_hasta?: string } | undefined)?.bloqueado_hasta;
  const ms = until ? new Date(until).getTime() - Date.now() : NaN;
  if (!(ms > 0)) return null;
  const minutes = Math.ceil(ms / 60_000);
  return `Cuenta bloqueada temporalmente por seguridad. Podrás intentar de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
}

export default function LoginForm() {
  const router = useRouter();
  const { startSession } = useSession();
  // Con "Recordar en este equipo" el correo del último ingreso queda escrito.
  const storedEmail = useSyncExternalStore(noopSubscribe, rememberedEmail, () => '');
  const [emailInput, setEmail] = useState<string | null>(null);
  const email = emailInput ?? storedEmail;
  const [password, setPassword] = useState('');
  // Lo guardado en el navegador se lee sin romper la hidratación; la elección de la casilla tiene prioridad.
  const storedRemember = useSyncExternalStore(noopSubscribe, deviceIsRemembered, () => false);
  const [rememberChoice, setRemember] = useState<boolean | null>(null);
  const remember = rememberChoice ?? storedRemember;
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // El reset tras cerrar sesión lo hace LoginPage con key={signedOut ? ...}: remonta el formulario limpio.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof fieldErrors = {};
    if (!email.trim()) next.email = 'Escribe tu correo institucional.';
    if (!password) next.password = 'Escribe tu contraseña.';
    setFieldErrors(next);
    setError('');
    if (next.email || next.password) return;

    stopResuming();
    setState('loading');
    try {
      const back = returnUrlFromLocation();
      // Al backend solo se envía la ruta; la consulta (filtros, pestañas) la conserva el frontend.
      const session = await authService.login({ email: email.trim(), password, return_url: back?.split('?')[0], recordar: remember });
      rememberDevice(remember, email.trim());
      await startSession(session);
      setState('success');
      setTimeout(() => {
        // En celular el formulario queda abajo; sin esto la aplicación abría a mitad de página.
        window.scrollTo({ top: 0 });
        // Tras cerrar sesión y volver a ingresar, todos los roles entran a Inicio; solo una sesión vencida
        // conserva el deep-link (returnUrl) para volver a donde estaba.
        router.replace(back ?? '/panel');
      }, 450);
    } catch (err) {
      const fields = apiFieldErrors(err);
      setFieldErrors({ email: fields.email, password: fields.password });
      setError(fields.email || fields.password ? '' : lockoutMessage(err) ?? apiErrorMessage(err, 'No se pudo iniciar sesión'));
      setState('idle');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
      <AuthError message={error} />

      <AuthItem>
        <AuthField
          id="login-email"
          label="Usuario o correo institucional"
          icon={AtSign}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setFieldErrors((f) => ({ ...f, email: undefined }));
          }}
          placeholder="r.morales@infraestructura.uni.edu"
          error={fieldErrors.email}
        />
      </AuthItem>

      <AuthItem>
        <PasswordField
          id="login-password"
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setFieldErrors((f) => ({ ...f, password: undefined }));
          }}
          error={fieldErrors.password}
        />
      </AuthItem>

      <AuthItem className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs">
        <label className="flex cursor-pointer select-none items-center gap-2 whitespace-nowrap text-slate-600">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#0A65A8]" />
          Recordar en este equipo
        </label>
        <Link href="/recuperar-password" className="group relative whitespace-nowrap font-semibold text-[#0A65A8]">
          ¿Olvidaste tu contraseña?
          <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-[#0A65A8] transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
        </Link>
      </AuthItem>

      <AuthItem>
        <AuthSubmit state={state} label="Iniciar sesión" loadingLabel="Ingresando" successLabel="Bienvenido" />
      </AuthItem>
    </form>
  );
}
