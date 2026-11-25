"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Link2Off, PartyPopper, WifiOff } from 'lucide-react';
import { accountActivationService, type ActivationInfo } from '@/services/accountActivationService';
import { apiErrorMessage, apiFieldErrors, apiStatus } from '@/lib/apiError';
import { POLICY_MESSAGE, meetsPolicy } from '@/lib/passwordPolicy';
import { usePasswordPolicy } from '@/lib/usePasswordPolicy';
import AuthLayout from '../AuthLayout';
import { authButton } from '../authStyles';
import { AuthError, AuthItem, AuthSubmit } from '../AuthMotion';
import PasswordField from '../recovery/PasswordField';
import PasswordRequirements from '../recovery/PasswordRequirements';

const EXPIRED_MESSAGE = 'El enlace de activación ha vencido. Solicite a su administrador que reenvíe la invitación.';
type Status = 'checking' | 'unreachable' | 'invalid' | 'form' | 'done';

const COPY: Record<Status, { title: string; subtitle: string }> = {
  checking: { title: 'Verificando invitación', subtitle: 'Un momento, estamos validando tu enlace' },
  unreachable: { title: 'Sin conexión', subtitle: 'No pudimos contactar al servidor' },
  invalid: { title: 'Enlace vencido', subtitle: 'La invitación ya no es válida' },
  form: { title: 'Activa tu cuenta', subtitle: 'Crea la contraseña con la que ingresarás a PRAXIS' },
  done: { title: '¡Cuenta activada!', subtitle: 'Ya puedes iniciar sesión con tu nueva contraseña' },
};

function Shell({ status, children }: { status: Status; children: React.ReactNode }) {
  return (
    <AuthLayout
      contentKey={status}
      title={COPY[status].title}
      subtitle={COPY[status].subtitle}
      showcaseTitle="Bienvenido a PRAXIS."
      showcaseDescription="Tu cuenta institucional ya fue creada. Solo falta que definas tu contraseña para empezar a reportar y gestionar la infraestructura."
      top={
        <Link href="/auth/login" className="group inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-[#0B1B3A]">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Ir al inicio de sesión
        </Link>
      }
    >
      {children}
    </AuthLayout>
  );
}

/** Activación de cuenta y primera contraseña desde el correo de bienvenida (HU-1.7). */
export default function ActivateAccountFlow({ token }: { token: string }) {
  const router = useRouter();
  const { rules } = usePasswordPolicy();
  const [status, setStatus] = useState<Status>(token ? 'checking' : 'invalid');
  const [info, setInfo] = useState<ActivationInfo>({});
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const checkToken = useCallback(() => {
    if (!token) return;
    accountActivationService
      .validate(token)
      .then((result) => {
        if (result.status === 'valid') {
          setInfo(result.info);
          setStatus('form');
        } else setStatus('invalid');
      })
      .catch(() => setStatus('unreachable'));
  }, [token]);

  useEffect(checkToken, [checkToken]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsPolicy(password, rules)) return setFieldError(POLICY_MESSAGE);
    if (confirmation !== password) return setFieldError('Las contraseñas no coinciden.');
    setSaving(true);
    setFieldError('');
    setError('');
    try {
      await accountActivationService.activate({ token, password, password_confirmation: confirmation });
      setStatus('done');
      setTimeout(() => router.replace('/auth/login?activada=1'), 2500);
    } catch (err) {
      if (apiStatus(err) === 410) return setStatus('invalid');
      const fields = apiFieldErrors(err);
      if (fields.password) setFieldError(fields.password);
      else setError(apiErrorMessage(err, 'No pudimos activar tu cuenta.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell status={status}>
      <AuthItem className="space-y-4">
        {status === 'checking' && <p className="py-6 text-center text-sm text-slate-500" role="status">Verificando tu invitación…</p>}
        {status === 'unreachable' && (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              Revisa tu conexión e intenta de nuevo.
            </p>
            <button type="button" className={authButton} onClick={() => { setStatus('checking'); checkToken(); }}>
              Intentar de nuevo
            </button>
          </>
        )}
        {status === 'invalid' && (
          <>
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700" role="alert">
              <Link2Off className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {EXPIRED_MESSAGE}
            </p>
            <Link href="/auth/login" className={authButton}>
              Ir al inicio de sesión
            </Link>
          </>
        )}
        {status === 'form' && (
          <form noValidate onSubmit={save} className="space-y-4">
            {(info.nombre || info.email) && (
              <p className="rounded-xl border border-[#D7E2ED] bg-[#F7FAFC] px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-600">
                Hola{info.nombre ? <> <span className="font-semibold text-slate-900">{info.nombre}</span></> : ''}, tu usuario es{' '}
                <span className="break-all font-semibold text-slate-900">{info.email ?? 'tu correo institucional'}</span>.
              </p>
            )}
            <PasswordField id="new-password" label="Nueva contraseña" value={password} autoFocus describedBy="password-requirements" onChange={(v) => { setPassword(v); setFieldError(''); }} />
            <PasswordRequirements id="password-requirements" password={password} rules={rules} />
            <PasswordField id="confirm-password" label="Confirmar nueva contraseña" value={confirmation} onChange={(v) => { setConfirmation(v); setFieldError(''); }} />
            {confirmation && confirmation === password && <p className="text-xs font-semibold text-emerald-700">✓ Las contraseñas coinciden</p>}
            <AuthError message={fieldError || error} />
            <AuthSubmit state={saving ? 'loading' : 'idle'} label="Activar cuenta" loadingLabel="Activando" />
          </form>
        )}
        {status === 'done' && (
          <>
            <p className="flex items-center justify-center gap-2 py-2 text-center text-xs text-slate-500" role="status">
              <PartyPopper className="h-4 w-4 text-[#35BE8B]" aria-hidden="true" />
              Te llevamos al inicio de sesión…
            </p>
            <Link href="/auth/login?activada=1" replace className={authButton}>
              Iniciar sesión ahora
            </Link>
          </>
        )}
      </AuthItem>
    </Shell>
  );
}

/** Fallback de Suspense mientras se lee el token de la URL. */
export function ActivateAccountFallback() {
  return (
    <Shell status="checking">
      <p className="py-6 text-center text-sm text-slate-500" role="status">
        Verificando tu invitación…
      </p>
    </Shell>
  );
}
