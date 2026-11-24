/**
 * "Recordar en este equipo".
 * El backend siempre deja una cookie de refresh de larga duración, así que el frontend decide si se usa:
 * - Con la casilla marcada, la sesión sigue al volver a abrir el navegador y el correo queda escrito en el login.
 * - Sin la casilla, la sesión solo dura mientras el navegador siga abierto. Para eso se marca el navegador con
 *   una cookie de sesión (sin vencimiento) y se registra la última actividad: algunos navegadores restauran las
 *   cookies de sesión al "continuar donde lo dejaste", así que si PRAXIS lleva un rato sin estar abierto
 *   también se da por cerrado.
 */
const REMEMBER_KEY = 'praxis.recordar-equipo';
const EMAIL_KEY = 'praxis.correo-recordado';
const LAST_SEEN_KEY = 'praxis.ultima-actividad';
const ALIVE_COOKIE = 'praxis_sesion_navegador';
/** Tiempo sin ninguna pestaña de PRAXIS abierta tras el cual se considera que el navegador se cerró. */
const CLOSED_AFTER_MS = 2 * 60 * 60 * 1000;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: se trata como "no recordar".
  }
}

function hasAliveCookie(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${ALIVE_COOKIE}=`));
}

/** Se llama al iniciar sesión con la elección de la casilla y el correo usado. */
export function rememberDevice(remember: boolean, email?: string) {
  write(REMEMBER_KEY, remember ? '1' : null);
  write(EMAIL_KEY, remember && email ? email : null);
  document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
  touchDevice();
}

/** Marca que PRAXIS sigue abierto en este navegador (se llama periódicamente con la sesión activa). */
export function touchDevice() {
  write(LAST_SEEN_KEY, String(Date.now()));
}

export function deviceIsRemembered(): boolean {
  return read(REMEMBER_KEY) === '1';
}

export function rememberedEmail(): string {
  return read(EMAIL_KEY) ?? '';
}

/** true si hay una sesión guardada que vale la pena intentar recuperar al abrir el login. */
export function mayHaveSession(): boolean {
  return deviceIsRemembered() || hasAliveCookie();
}

/** true si el navegador se cerró desde el último inicio de sesión y la persona no pidió recordar el equipo. */
export function sessionShouldEnd(): boolean {
  if (deviceIsRemembered()) return false;
  if (!hasAliveCookie()) return true;
  const lastSeen = Number(read(LAST_SEEN_KEY) ?? 0);
  return !lastSeen || Date.now() - lastSeen > CLOSED_AFTER_MS;
}

/** Al cerrar sesión se olvida la marca del navegador (el correo recordado se conserva para el próximo ingreso). */
export function forgetDevice() {
  document.cookie = `${ALIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  write(LAST_SEEN_KEY, null);
}
