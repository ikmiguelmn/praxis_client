import type { Page, Request, Route } from '@playwright/test';

/**
 * Sesión simulada por rol para el humo del Sprint 4.
 * Cada prueba usa su propio contexto de Playwright, así que no se comparten cookies ni tokens.
 * Todo el tráfico a /api/v1 se intercepta con page.route(): no se necesita backend.
 * El token es un valor ficticio que nunca sale del navegador de la prueba.
 */

export type CodigoRol = 'R01' | 'R03' | 'R04' | 'R05' | 'R07';

const ROLES: Record<CodigoRol, { nombre: string; inicio: string; modulos: { codigo: string; etiqueta: string; ruta: string }[] }> = {
  R01: { nombre: 'Reportante', inicio: '/mis-solicitudes', modulos: [{ codigo: 'MIS_SOLICITUDES', etiqueta: 'Mis solicitudes', ruta: '/mis-solicitudes' }] },
  R03: { nombre: 'Coordinador de mantenimiento', inicio: '/planificacion', modulos: [{ codigo: 'PLANIFICACION', etiqueta: 'Planificación', ruta: '/planificacion' }] },
  R04: { nombre: 'Técnico de mantenimiento', inicio: '/mis-tareas', modulos: [{ codigo: 'MIS_TAREAS', etiqueta: 'Mis tareas', ruta: '/mis-tareas' }] },
  R05: { nombre: 'Responsable de autorizaciones', inicio: '/autorizaciones', modulos: [{ codigo: 'AUTORIZACIONES', etiqueta: 'Autorizaciones', ruta: '/autorizaciones' }] },
  R07: { nombre: 'Administrador', inicio: '/panel', modulos: [] },
};

export interface Respuesta {
  status?: number;
  body?: unknown;
}

export type Manejador = (peticion: Request) => Respuesta | unknown;

export interface LlamadaApi {
  metodo: string;
  ruta: string;
  consulta: URLSearchParams;
  cuerpo: unknown;
}

export interface SesionSimulada {
  llamadas: LlamadaApi[];
  /** Rutas /api/v1 que la prueba no simuló (deberían estar vacías). */
  sinSimular: string[];
  llamadasA: (metodo: string, ruta: string) => LlamadaApi[];
}

function cors(peticion: Request): Record<string, string> {
  const origen = peticion.headers()['origin'] ?? 'http://localhost:3000';

  return {
    'access-control-allow-origin': origen,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': peticion.headers()['access-control-request-headers'] ?? '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    vary: 'Origin',
  };
}

function perfil(rol: CodigoRol) {
  const datos = ROLES[rol];

  return {
    id: 9000,
    nombre: `Usuario QA ${rol}`,
    email: `qa.${rol.toLowerCase()}@example.test`,
    telefono: null,
    activo: true,
    roles: [{ codigo: rol, nombre: datos.nombre, ruta_inicio: datos.inicio }],
    rol_activo: { codigo: rol, nombre: datos.nombre },
    ruta_inicio: datos.inicio,
    especialidades: [],
    permisos: datos.modulos.map((m) => ({ modulo: m.codigo, nivel_acceso: 'TOTAL' })),
  };
}

/**
 * Prepara el contexto de la página con una sesión válida del rol indicado.
 * `manejadores` se indexa como "METODO /ruta" (sin /api/v1), p. ej. "GET /tecnico/tareas".
 */
export async function iniciarSesionSimulada(page: Page, rol: CodigoRol, manejadores: Record<string, Manejador> = {}): Promise<SesionSimulada> {
  const llamadas: LlamadaApi[] = [];
  const sinSimular: string[] = [];
  const datos = ROLES[rol];

  const base: Record<string, Manejador> = {
    'POST /auth/refresh': () => ({
      access_token: 'token-ficticio-qa',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_expires_in: 7200,
      redirect_to: datos.inicio,
      usuario: perfil(rol),
    }),
    'GET /auth/me': () => ({ data: perfil(rol) }),
    'GET /navegacion/menu': () => ({
      data: datos.modulos.map((m) => ({ ...m, icono: null, grupo: 'Operación', solo_lectura: false, nivel_acceso: 'TOTAL' })),
    }),
    'GET /notificaciones': () => ({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }),
    'GET /notificaciones/resumen': () => ({ data: { no_leidas: 0 } }),
  };

  await page.route('**/api/v1/**', async (route: Route) => {
    const peticion = route.request();
    const url = new URL(peticion.url());
    const ruta = url.pathname.replace(/^.*\/api\/v1/, '');

    if (peticion.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors(peticion) });

      return;
    }

    let cuerpo: unknown = null;
    try {
      cuerpo = peticion.postDataJSON();
    } catch {
      cuerpo = null;
    }
    llamadas.push({ metodo: peticion.method(), ruta, consulta: url.searchParams, cuerpo });

    const manejador = manejadores[`${peticion.method()} ${ruta}`] ?? base[`${peticion.method()} ${ruta}`];
    if (!manejador) {
      sinSimular.push(`${peticion.method()} ${ruta}`);
      await route.fulfill({ status: 404, headers: cors(peticion), contentType: 'application/json', body: JSON.stringify({ detail: 'Sin simular en la prueba' }) });

      return;
    }

    const resultado = manejador(peticion) as Respuesta;
    const conEstado = resultado !== null && typeof resultado === 'object' && 'body' in (resultado as object);
    await route.fulfill({
      status: conEstado ? ((resultado as Respuesta).status ?? 200) : 200,
      headers: cors(peticion),
      contentType: 'application/json',
      body: JSON.stringify(conEstado ? (resultado as Respuesta).body : resultado),
    });
  });

  return {
    llamadas,
    sinSimular,
    llamadasA: (metodo, ruta) => llamadas.filter((l) => l.metodo === metodo && l.ruta === ruta),
  };
}

/** Fila mínima compatible con IncidenciaResumen / ConsolaFila. */
export function filaIncidencia(id: string, ticket: string, estado: { codigo: string; nombre: string }, extra: Record<string, unknown> = {}) {
  return {
    id,
    codigo_ticket: ticket,
    resumen: `Resumen de ${ticket}`,
    estado: { ...estado, color: '#64748b' },
    prioridad: { codigo: 'ALTA', nombre: 'Alta', color: '#f59e0b' },
    categoria: { id: 1, codigo: 'CERRAJERIA', nombre: 'Cerrajería' },
    ubicacion: { texto: 'Sede Central > Bloque A > Piso 1 > Aula 101', espacio: { nombre: 'Aula 101' }, edificio: { nombre: 'Bloque A' }, piso: { nombre: 'Piso 1' } },
    tecnico_asignado: null,
    es_riesgo_inmediato: false,
    posible_duplicado: false,
    fecha_registro: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
    fecha_cierre: null,
    sla: null,
    ...extra,
  };
}

export function paginado<T>(filas: T[]) {
  return { data: filas, meta: { current_page: 1, last_page: 1, per_page: 50, total: filas.length } };
}
