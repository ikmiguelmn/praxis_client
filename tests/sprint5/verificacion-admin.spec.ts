import { expect, test } from '@playwright/test';
import { filaIncidencia, iniciarSesionSimulada, paginado, type ModuloSimulado } from '../sprint4/fixtures/sesion';

/**
 * QA Sprint 5: bandeja de verificación (E09) y parámetros del sistema (E11) con API simulada.
 * KAN-266 (HU-9.1) y KAN-331 (HU-11.3).
 */

const E12 = { codigo: 'E12', nombre: 'Pendiente de verificación' };
const NIVELES = ['ALTO', 'MEDIO', 'BAJO'];
const URGENCIAS = ['ALTA', 'MEDIA', 'BAJA'];

function parametros() {
  return {
    data: {
      matriz_prioridad: NIVELES.flatMap((impacto) => URGENCIAS.map((urgencia) => ({ impacto, urgencia, prioridad: impacto === 'ALTO' && urgencia === 'ALTA' ? 'CRITICA' : 'MEDIA' }))),
      sla: [
        { codigo: 'CRITICA', nombre: 'Crítica', horas_primera_respuesta: 1, horas_resolucion: 6 },
        { codigo: 'ALTA', nombre: 'Alta', horas_primera_respuesta: 4, horas_resolucion: 24 },
      ],
      parametros: [{ clave: 'LIMITE_WIP_TECNICO', valor: 5, tipo_dato: 'entero', grupo: 'OPERACION', descripcion: 'Órdenes activas máximas por técnico.', actualizado_en: null }],
    },
  };
}

test.describe('verificación de calidad (KAN-266)', () => {
  test('[KAN-266] el verificador ve las intervenciones pendientes y cada una enlaza a su ficha', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R06', {
      'GET /verificacion/pendientes': () => paginado([filaIncidencia('inc-e12', 'TKT-2026-001212', E12)]),
    });

    await page.goto('/verificacion');

    await expect(page.getByRole('heading', { name: 'Verificación de calidad' })).toBeVisible();
    await expect(page.getByRole('link', { name: /TKT-2026-001212/ })).toHaveAttribute('href', '/incidencias/inc-e12');
    expect(sesion.sinSimular).toEqual([]);
  });

  test('[KAN-266] sin intervenciones terminadas muestra la bandeja vacía', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R06', { 'GET /verificacion/pendientes': () => paginado([]) });

    await page.goto('/verificacion');

    await expect(page.getByRole('heading', { name: 'No hay intervenciones por verificar' })).toBeVisible();
  });

  test('[KAN-266] el técnico (R04) no accede a la bandeja de verificación', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R04', { 'GET /tecnico/tareas': () => ({ data: [] }) });

    await page.goto('/verificacion');

    await expect(page.getByRole('heading', { name: 'Esta sección no está disponible para tu rol' })).toBeVisible();
    expect(sesion.llamadasA('GET', '/verificacion/pendientes')).toEqual([]);
  });
});

test.describe('parámetros del sistema (KAN-331)', () => {
  const MODULO_PARAMETROS = (nivel: 'TOTAL' | 'LECTURA'): ModuloSimulado[] => [{ codigo: 'ADMIN_PARAMETROS', etiqueta: 'Parámetros del sistema', ruta: '/admin/parametros', nivel }];

  test('[KAN-331] la matriz muestra las 9 combinaciones de impacto y urgencia (Escenario 1)', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R07', { 'GET /admin/parametros': () => parametros() }, { modulos: MODULO_PARAMETROS('TOTAL') });

    await page.goto('/admin/parametros');

    await expect(page.getByRole('heading', { name: 'Matriz de prioridad' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Impacto .+, urgencia .+: / })).toHaveCount(9);
  });

  test('[KAN-331] no permite dejar una meta SLA en negativo: el campo se corrige al mínimo de 1 (Escenario 3)', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R07', { 'GET /admin/parametros': () => parametros() }, { modulos: MODULO_PARAMETROS('TOTAL') });

    await page.goto('/admin/parametros');
    const resolucion = page.getByRole('spinbutton', { name: 'Resolución' }).first();
    await resolucion.fill('-3');

    await expect(resolucion).not.toHaveValue('-3');
    expect(Number(await resolucion.inputValue())).toBeGreaterThanOrEqual(1);
  });

  test('[KAN-331] el coordinador (R03) ve los parámetros en solo lectura', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R03', { 'GET /admin/parametros': () => parametros() }, { modulos: MODULO_PARAMETROS('LECTURA') });

    await page.goto('/admin/parametros');

    await expect(page.getByRole('heading', { name: 'Matriz de prioridad' })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Resolución' }).first()).toBeDisabled();
    expect(sesion.llamadasA('PUT', '/admin/parametros')).toEqual([]);
  });
});
