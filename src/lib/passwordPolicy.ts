/**
 * Política institucional de contraseñas (HU-1.4, HU-11.4). El administrador la parametriza en
 * /admin/parametros; el cliente la replica para dar retroalimentación mientras se escribe y el backend
 * sigue siendo la fuente de verdad.
 */
export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/** Reglas activas de la política (GET /auth/politica-contrasena). */
export interface PasswordPolicy {
  longitud_minima: number;
  exige_mayuscula: boolean;
  exige_minuscula: boolean;
  exige_numero: boolean;
  exige_simbolo: boolean;
}

/** Equivale a `Password::min(8)->mixedCase()->numbers()->symbols()` mientras el backend no publique la política. */
export const DEFAULT_POLICY: PasswordPolicy = {
  longitud_minima: 8,
  exige_mayuscula: true,
  exige_minuscula: true,
  exige_numero: true,
  exige_simbolo: true,
};

export function buildRules(policy: PasswordPolicy): PasswordRule[] {
  const min = policy.longitud_minima;
  const rules: (PasswordRule | false)[] = [
    { id: 'length', label: `Mínimo ${min} caracteres`, test: (p) => [...p].length >= min },
    policy.exige_mayuscula && { id: 'upper', label: 'Una letra mayúscula', test: (p) => /\p{Lu}/u.test(p) },
    policy.exige_minuscula && { id: 'lower', label: 'Una letra minúscula', test: (p) => /\p{Ll}/u.test(p) },
    policy.exige_numero && { id: 'number', label: 'Un número', test: (p) => /\p{N}/u.test(p) },
    policy.exige_simbolo && { id: 'symbol', label: 'Un carácter especial (@$!%*?&#)', test: (p) => /[\p{Z}\p{S}\p{P}]/u.test(p) },
  ];
  return rules.filter((rule): rule is PasswordRule => Boolean(rule));
}

export const PASSWORD_RULES = buildRules(DEFAULT_POLICY);

export function passedRules(password: string, rules: PasswordRule[] = PASSWORD_RULES): Set<string> {
  return new Set(rules.filter((rule) => rule.test(password)).map((rule) => rule.id));
}

export function meetsPolicy(password: string, rules: PasswordRule[] = PASSWORD_RULES): boolean {
  return passedRules(password, rules).size === rules.length;
}

export const POLICY_MESSAGE = 'La contraseña no cumple con las políticas de seguridad vigentes.';
