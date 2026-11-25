"use client";

import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { DEFAULT_POLICY, buildRules, type PasswordPolicy, type PasswordRule } from './passwordPolicy';

// Se consulta una sola vez por carga de la aplicación; las pantallas de contraseña la comparten.
let cached: PasswordPolicy | null = null;
let pending: Promise<PasswordPolicy> | null = null;

function loadPolicy(): Promise<PasswordPolicy> {
  pending ??= api
    .get<{ data: Partial<PasswordPolicy> }>('/auth/politica-contrasena')
    .then(({ data }) => ({ ...DEFAULT_POLICY, ...data.data }))
    // Si el backend todavía no publica la política, se usa la institucional por defecto.
    .catch(() => DEFAULT_POLICY)
    .then((policy) => (cached = policy));
  return pending;
}

/** Tras guardar la política en /admin/parametros, la próxima pantalla la vuelve a consultar. */
export function forgetPasswordPolicy() {
  cached = null;
  pending = null;
}

/** Política de contraseñas vigente (HU-11.4) y sus reglas para el checklist visual. */
export function usePasswordPolicy(): { policy: PasswordPolicy; rules: PasswordRule[] } {
  const [policy, setPolicy] = useState<PasswordPolicy>(cached ?? DEFAULT_POLICY);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    void loadPolicy().then((p) => alive && setPolicy(p));
    return () => {
      alive = false;
    };
  }, []);

  const rules = useMemo(() => buildRules(policy), [policy]);
  return { policy, rules };
}
