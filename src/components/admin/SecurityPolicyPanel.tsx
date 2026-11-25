"use client";

import { motion } from 'motion/react';
import { Check, Clock3, KeyRound, LockKeyhole, Minus, Plus, ShieldAlert } from 'lucide-react';
import type { Parametros } from '@/services/adminService';
import type { PasswordRule } from '@/lib/passwordPolicy';

type Param = Parametros['parametros'][number];

interface Spec {
  label: string;
  help: string;
  kind: 'number' | 'toggle' | 'choice';
  min: number;
  max: number;
  /** Valores permitidos para `choice`; 0 se muestra como "Sin expiración". */
  options?: number[];
  unit?: string;
  section: 'complejidad' | 'vigencia' | 'acceso';
}

/** Parámetros del grupo SEGURIDAD con sus rangos institucionales (HU-11.4). */
export const SECURITY_SPEC: Record<string, Spec> = {
  PASSWORD_LONGITUD_MINIMA: { section: 'complejidad', label: 'Longitud mínima', help: 'Entre 8 y 32 caracteres.', kind: 'number', min: 8, max: 32, unit: 'caracteres' },
  PASSWORD_EXIGE_MAYUSCULA: { section: 'complejidad', label: 'Mayúsculas obligatorias', help: 'Al menos una letra mayúscula.', kind: 'toggle', min: 0, max: 1 },
  PASSWORD_EXIGE_MINUSCULA: { section: 'complejidad', label: 'Minúsculas obligatorias', help: 'Al menos una letra minúscula.', kind: 'toggle', min: 0, max: 1 },
  PASSWORD_EXIGE_NUMERO: { section: 'complejidad', label: 'Números obligatorios', help: 'Al menos un dígito.', kind: 'toggle', min: 0, max: 1 },
  PASSWORD_EXIGE_SIMBOLO: { section: 'complejidad', label: 'Caracteres especiales obligatorios', help: 'Al menos uno de @$!%*?&#.', kind: 'toggle', min: 0, max: 1 },
  PASSWORD_VIGENCIA_DIAS: { section: 'vigencia', label: 'Vigencia máxima', help: 'Al vencer, se pide cambiarla en el siguiente ingreso.', kind: 'choice', min: 0, max: 180, options: [30, 60, 90, 180, 0], unit: 'días' },
  PASSWORD_HISTORIAL: { section: 'vigencia', label: 'Contraseñas no repetibles', help: 'Últimas N contraseñas que no se pueden reutilizar.', kind: 'number', min: 3, max: 5, unit: 'últimas' },
  LOGIN_MAXIMO_INTENTOS: { section: 'acceso', label: 'Intentos fallidos permitidos', help: 'Antes del bloqueo temporal, entre 3 y 5.', kind: 'number', min: 3, max: 5, unit: 'intentos' },
  LOGIN_BLOQUEO_MINUTOS: { section: 'acceso', label: 'Tiempo de bloqueo', help: 'Duración del bloqueo automático de la cuenta.', kind: 'choice', min: 1, max: 1440, options: [15, 30, 60], unit: 'min' },
  LOGIN_VENTANA_MINUTOS: { section: 'acceso', label: 'Ventana de intentos', help: 'Minutos en los que se cuentan los intentos fallidos.', kind: 'number', min: 1, max: 1440, unit: 'min' },
  RECUPERACION_EXPIRACION_MINUTOS: { section: 'acceso', label: 'Vigencia del enlace de recuperación', help: 'Minutos antes de que venza el enlace del correo.', kind: 'number', min: 5, max: 1440, unit: 'min' },
};

/** Valor por defecto mostrado cuando el servidor aún no publica el parámetro. */
const FALLBACK: Record<string, number> = {
  PASSWORD_LONGITUD_MINIMA: 8,
  PASSWORD_EXIGE_MAYUSCULA: 1,
  PASSWORD_EXIGE_MINUSCULA: 1,
  PASSWORD_EXIGE_NUMERO: 1,
  PASSWORD_EXIGE_SIMBOLO: 1,
  PASSWORD_VIGENCIA_DIAS: 0,
  PASSWORD_HISTORIAL: 3,
};

export function withinSpec(key: string, value: number): boolean {
  const spec = SECURITY_SPEC[key];
  if (!spec) return value >= 1;
  return Number.isFinite(value) && value >= spec.min && value <= spec.max;
}

const SECTIONS = [
  { id: 'complejidad', title: 'Complejidad', icon: KeyRound, description: 'Reglas que debe cumplir toda contraseña nueva.' },
  { id: 'vigencia', title: 'Vigencia e historial', icon: Clock3, description: 'Cada cuánto se renueva y qué no se puede repetir.' },
  { id: 'acceso', title: 'Bloqueo por intentos', icon: LockKeyhole, description: 'Protección contra fuerza bruta en el inicio de sesión.' },
] as const;

interface Props {
  params: Param[];
  values: Record<string, number>;
  readOnly: boolean;
  rules: PasswordRule[];
  onChange: (key: string, value: number) => void;
}

/** Pestaña "Seguridad y contraseñas" de /admin/parametros (HU-11.4). */
export default function SecurityPolicyPanel({ params, values, readOnly, rules, onChange }: Props) {
  const byKey = new Map(params.map((p) => [p.clave, p]));
  const keys = [...Object.keys(SECURITY_SPEC), ...params.map((p) => p.clave).filter((k) => !SECURITY_SPEC[k])];
  const pending = Object.keys(SECURITY_SPEC).filter((k) => !byKey.has(k));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {SECTIONS.map(({ id, title, icon: Icon, description }) => {
          const items = keys.filter((k) => (SECURITY_SPEC[k]?.section ?? 'acceso') === id);
          return (
            <section key={id} className="card p-6">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {title}
              </h2>
              <p className="mb-4 text-xs text-slate-500">{description}</p>
              <ul className="space-y-2">
                {items.map((key) => {
                  const param = byKey.get(key);
                  const spec = SECURITY_SPEC[key];
                  const available = Boolean(param);
                  const value = values[key] ?? FALLBACK[key] ?? spec?.min ?? 1;
                  const dirty = available && values[key] !== param!.valor;
                  const disabled = readOnly || !available;
                  const bad = available && !withinSpec(key, value);
                  return (
                    <li key={key} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${bad ? 'border-red-300 bg-red-50/40' : dirty ? 'border-praxis-navy bg-sky-50/40' : 'border-praxis-line'}`}>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                          {spec?.label ?? param?.descripcion ?? key}
                          {!available && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Pendiente en el servidor</span>}
                        </span>
                        <span className="block text-xs text-slate-500">{spec?.help ?? param?.descripcion}</span>
                      </span>
                      {spec?.kind === 'toggle' ? (
                        <Toggle label={spec.label} checked={value === 1} disabled={disabled} onChange={(on) => onChange(key, on ? 1 : 0)} />
                      ) : spec?.kind === 'choice' ? (
                        <Choice value={value} options={spec.options!} unit={spec.unit} disabled={disabled} onChange={(v) => onChange(key, v)} />
                      ) : (
                        <Stepper value={value} min={spec?.min ?? 1} max={spec?.max ?? 100000} unit={spec?.unit} disabled={disabled} error={bad} onChange={(v) => onChange(key, v)} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-40 xl:self-start">
        <section className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldAlert className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Así verán los requisitos
          </h3>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">Checklist que se muestra al crear o cambiar una contraseña.</p>
          <ul className="space-y-1.5">
            {rules.map((rule) => (
              <motion.li key={rule.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={4} aria-hidden="true" />
                </span>
                {rule.label}
              </motion.li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
            Las sesiones abiertas no se cierran al guardar; la nueva política se exige en el próximo cambio o vencimiento de cada contraseña.
          </p>
        </section>
        {pending.length > 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            Los parámetros marcados como <strong>pendientes en el servidor</strong> se podrán editar cuando el backend los publique en <code>/admin/parametros</code>.
          </p>
        )}
      </aside>
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <motion.span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" animate={{ x: checked ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  );
}

function Choice({ value, options, unit, disabled, onChange }: { value: number; options: number[]; unit?: string; disabled?: boolean; onChange: (v: number) => void }) {
  // Un valor guardado que no está en la lista se conserva como opción.
  const list = options.includes(value) ? options : [...options, value].sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
  return (
    <span className="inline-flex flex-wrap rounded-xl bg-praxis-field p-1" role="group">
      {list.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed ${value === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'} ${disabled && value !== option ? 'opacity-50' : ''}`}
        >
          {option === 0 ? 'Sin expiración' : `${option} ${unit ?? ''}`.trim()}
        </button>
      ))}
    </span>
  );
}

function Stepper({ value, onChange, min, max, unit, disabled, error }: { value: number; onChange: (v: number) => void; min: number; max: number; unit?: string; disabled?: boolean; error?: boolean }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v) || min));
  return (
    <span className="flex items-center gap-2">
      <span className={`flex items-center rounded-xl ${error ? 'bg-red-50 ring-1 ring-red-300' : 'bg-praxis-field'} ${disabled ? 'opacity-60' : ''}`}>
        <button type="button" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - 1))} aria-label="Disminuir" className="p-2 text-slate-500 disabled:opacity-30">
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input
          type="number"
          aria-label={unit ?? 'Valor'}
          min={min}
          max={max}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ width: `${Math.max(3, String(value).length + 1)}ch` }}
          className="bg-transparent text-center text-sm font-bold tabular-nums text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))} aria-label="Aumentar" className="p-2 text-slate-500 disabled:opacity-30">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
      {unit && <span className="w-16 text-xs text-slate-500">{unit}</span>}
    </span>
  );
}
