/**
 * "Recordar en este equipo".
 * El backend siempre deja una cookie de refresh de larga duración, así que el frontend decide si se usa:
 * si la persona no pidió recordar el equipo, la sesión solo dura mientras el navegador siga abierto.
 * Para eso se marca el navegador con una cookie de sesión (sin fecha de vencimiento), que el navegador
 * borra al cerrarse y que comparten todas las pestañas.
 */
const REMEMBER_KEY = 'praxis.recordar-equipo';
const ALIVE_COOKIE = 'praxis_sesion_navegador';

function hasAliveCookie(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${ALIVE_COOKIE}=`));
}

/** Se llama al iniciar sesión con la elección de la casilla. */
export function rememberDevice(remember: boolean) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Sin almacenamiento: se trata como "no recordar".
  }
  document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
}

/** true si el navegador se cerró desde el último inicio de sesión y la persona no pidió recordar el equipo. */
export function sessionShouldEnd(): boolean {
  let remembered = false;
  try {
    remembered = localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    remembered = false;
  }
  return !remembered && !hasAliveCookie();
}

/** Al cerrar sesión se olvida la marca del navegador y la preferencia de "recordar". */
export function forgetDevice() {
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Sin almacenamiento: basta con caducar la cookie de sesión del navegador.
  }
  document.cookie = `${ALIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function deviceIsRemembered(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
}
