"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { AtSign, ChevronLeft, Clock, MailOpen, MousePointerClick, RotateCw, ShieldCheck } from 'lucide-react';
import { passwordRecoveryService } from '@/services/passwordRecoveryService';
import { apiErrorMessage, apiFieldErrors } from '@/lib/apiError';
import AuthLayout from '../AuthLayout';
import { AuthError, AuthField, AuthItem, AuthSubmit } from '../AuthMotion';
import { authButton } from '../authStyles';
import StepIndicator from './StepIndicator';
import FormAlert from './FormAlert';

const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Step = 'email' | 'sent';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  email: { title: 'Recuperar contraseña', subtitle: 'Te enviaremos un enlace a tu correo institucional' },
  sent: { title: 'Revisa tu correo', subtitle: 'Abre el enlace que te enviamos para crear tu nueva contraseña' },
};

const HINTS = [
  { icon: MailOpen, text: 'Abre el correo de PRAXIS. Si no aparece, revisa la carpeta de spam o correo no deseado.' },
  { icon: MousePointerClick, text: 'Haz clic en el enlace para crear tu nueva contraseña.' },
  { icon: Clock, text: 'El enlace vence a los 30 minutos y solo sirve una vez.' },
];

const linkButton = 'group relative font-semibold text-[#0A65A8] hover:underline underline-offset-4 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline';

/** Solicitud de recuperación (HU-1.4): el correo trae un enlace a /restablecer-password/{token}. */
export default function RequestRecoveryFlow() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const go = (next: Step) => {
    setError('');
    setFieldError('');
    setNotice('');
    setStep(next);
  };

  const sendLink = async (resend = false) => {
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError(value ? 'Revisa el formato del correo.' : 'Escribe tu correo institucional.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await passwordRecoveryService.request(value);
      setCooldown(RESEND_SECONDS);
      if (resend) setNotice('Te enviamos un enlace nuevo. El anterior dejó de funcionar.');
      else go('sent');
    } catch (err) {
      const fields = apiFieldErrors(err);
      if (fields.email) setFieldError(fields.email);
      else setError(apiErrorMessage(err, 'No pudimos enviar el correo. Intenta de nuevo.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      contentKey={step}
      title={COPY[step].title}
      subtitle={COPY[step].subtitle}
      showcaseTitle="Recupera el acceso a tu cuenta institucional."
      showcaseDescription="Te enviaremos un enlace de un solo uso. Al crear tu nueva contraseña cerraremos las sesiones abiertas en otros equipos."
      top={
        // En "Revisa tu correo" ya está el botón grande para volver.
        step === 'email' && (
        <Link href="/auth/login" className="group inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 transition-colors hover:text-[#0B1B3A]">
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          Volver al inicio de sesión
        </Link>
        )
      }
    >
      <AuthItem>
        <StepIndicator current={step === 'email' ? 1 : 2} />
      </AuthItem>

      {step === 'email' && (
        <form
          noValidate
          className="space-y-4 sm:space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendLink();
          }}
        >
          <AuthItem>
            <AuthField
              id="rec-email"
              label="Correo institucional"
              icon={AtSign}
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(v) => {
                setEmail(v);
                setFieldError('');
              }}
              placeholder="nombre@universidad.edu.co"
              error={fieldError}
            />
          </AuthItem>
          <AuthError message={error} />
          <AuthItem>
            <AuthSubmit state={busy ? 'loading' : 'idle'} label="Enviar enlace" loadingLabel="Enviando" />
          </AuthItem>
        </form>
      )}

      {step === 'sent' && (
        <div className="space-y-4 sm:space-y-5" role="status">
          <AuthItem>
            <div className="rounded-2xl border border-[#D7E2ED] bg-[#F7FAFC] px-4 py-4">
              <div className="flex items-center gap-3">
                <motion.span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1B3A] text-[#35BE8B]"
                  animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <MailOpen className="h-5 w-5" aria-hidden="true" />
                </motion.span>
                <p className="min-w-0 text-[13px] leading-relaxed text-slate-600">
                  Si <span className="break-all font-semibold text-slate-900">{email.trim()}</span> está registrado, te llegó un correo con el enlace para restablecer tu contraseña.
                </p>
              </div>
              <ol className="mt-4 space-y-2.5 border-t border-dashed border-[#C9D6E3] pt-4">
                {HINTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-600">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0A65A8]" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ol>
            </div>
          </AuthItem>
          <FormAlert message={notice} tone="success" />
          <AuthError message={error} />
          <AuthItem>
            <Link href="/auth/login" className={authButton}>
              Volver al inicio de sesión
            </Link>
          </AuthItem>
          <AuthItem className="flex items-center justify-between text-[13px]">
            <button type="button" onClick={() => go('email')} className={linkButton}>
              Usar otro correo
            </button>
            <button type="button" onClick={() => void sendLink(true)} disabled={busy || cooldown > 0} className={`${linkButton} inline-flex items-center gap-1.5`}>
              <RotateCw className={`h-3.5 w-3.5 ${cooldown > 0 ? '' : 'transition-transform duration-500 group-hover:rotate-180'}`} aria-hidden="true" />
              {cooldown > 0 ? <span className="tabular-nums">Reenviar en {cooldown}s</span> : 'Reenviar enlace'}
            </button>
          </AuthItem>
          <AuthItem>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Por seguridad no confirmamos si el correo tiene una cuenta.
            </p>
          </AuthItem>
        </div>
      )}
    </AuthLayout>
  );
}
