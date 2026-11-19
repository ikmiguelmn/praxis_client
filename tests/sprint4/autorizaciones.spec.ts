import { expect, test } from '@playwright/test';
import { iniciarSesionSimulada } from './fixtures/sesion';

/**
 * QA Sprint 4: bandeja de autorizaciones y dictamen (R05).
 * KAN-251 (solicitud de recursos), KAN-256 (dictamen) y KAN-261 (espera de recursos).
 */

function solicitud(id: number, ticket: string, costo: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    estado_solicitud: 'PENDIENTE_AUTORIZACION',
    decision_requerida: `Compra autorizada para ${ticket}`,
    requiere_autorizacion: true,
    es_emergencia: false,
    resultado_dictamen: null,
    justificacion_dictamen: null,
    costo_total_estimado: costo,
    detalles: [{ id: id * 10, recurso_nombre: `Recurso de ${ticket}`, cantidad: 1, unidad: 'und', costo_estimado: costo, disponible: false }],
    solicitante: { id: 3, name: 'Coordinador QA' },
    fecha_solicitud: new Date().toISOString(),
    incidencia: {
      id: `inc-${id}`,
      codigo_ticket: ticket,
      resumen: `Resumen de ${ticket}`,
      estado: { codigo: 'E08', nombre: 'Pendiente de autorización' },
      prioridad: { codigo: 'ALTA', nombre: 'Alta', color: '#f59e0b' },
    },
    ...extra,
  };
}

const pendientes = [solicitud(1, 'TKT-2026-000101', 350_000), solicitud(2, 'TKT-2026-000202', 4_500_000, { es_emergencia: true })];

test.describe('autorizaciones (R05)', () => {
  test('[KAN-256] lista las solicitudes pendientes con la emergencia primero', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R05', { 'GET /autorizaciones/pendientes': () => ({ data: pendientes }) });

    await page.goto('/autorizaciones');

    await expect(page.getByRole('heading', { name: 'Autorizaciones pendientes' })).toBeVisible();
    const tarjetas = page.getByRole('button', { pressed: true }).or(page.getByRole('button', { pressed: false })).filter({ hasText: 'TKT-2026-' });
    await expect(tarjetas.first()).toContainText('TKT-2026-000202');
    await expect(tarjetas.first()).toContainText('Emergencia');
    expect(sesion.sinSimular).toEqual([]);
  });

  test('[KAN-256] el filtro por monto oculta las solicitudes fuera del rango', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R05', { 'GET /autorizaciones/pendientes': () => ({ data: pendientes }) });

    await page.goto('/autorizaciones');
    await page.getByRole('button', { name: 'Hasta $500.000' }).click();

    await expect(page.getByRole('button', { name: /TKT-2026-000101/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /TKT-2026-000202/ })).toHaveCount(0);
  });

  test('[KAN-256] el rechazo sin justificación se bloquea y no llama al servidor', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R05', { 'GET /autorizaciones/pendientes': () => ({ data: [pendientes[0]] }) });

    await page.goto('/autorizaciones');
    await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
    await page.getByRole('button', { name: 'Rechazar solicitud' }).click();

    await expect(page.getByText('Justifica el rechazo (mínimo 10 caracteres).')).toBeVisible();
    expect(sesion.llamadasA('POST', '/solicitudes-recursos/1/dictamen')).toHaveLength(0);
  });

  test('[KAN-256] suspender sin condiciones de reanudación se bloquea', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R05', { 'GET /autorizaciones/pendientes': () => ({ data: [pendientes[0]] }) });

    await page.goto('/autorizaciones');
    await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
    await page.getByRole('button', { name: /^Suspender/ }).click();
    await page.getByLabel(/Justificación del rechazo/).fill('Inviable presupuestalmente en el periodo');
    await page.getByRole('button', { name: 'Rechazar solicitud' }).click();

    await expect(page.getByText('Indica las condiciones para reanudar.')).toBeVisible();
    expect(sesion.llamadasA('POST', '/solicitudes-recursos/1/dictamen')).toHaveLength(0);
  });

  test('[KAN-256] aprobar envía el dictamen APROBADA y confirma al usuario', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R05', {
      'GET /autorizaciones/pendientes': () => ({ data: [pendientes[0]] }),
      'POST /solicitudes-recursos/1/dictamen': () => ({ mensaje: 'Solicitud dictaminada.', data: { id: 1 } }),
    });

    await page.goto('/autorizaciones');
    await page.getByRole('button', { name: 'Aprobar solicitud' }).click();

    await expect(page.getByText('Solicitud aprobada.')).toBeVisible();
    const envios = sesion.llamadasA('POST', '/solicitudes-recursos/1/dictamen');
    expect(envios).toHaveLength(1);
    // El cliente omite los booleanos en false; el backend los interpreta como "recursos no disponibles".
    expect(envios[0].cuerpo).toMatchObject({ resultado: 'APROBADA' });
    expect(envios[0].cuerpo).not.toMatchObject({ recursos_disponibles: true });
  });

  test('[KAN-256] el rechazo válido envía justificación y acción de rechazo', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R05', {
      'GET /autorizaciones/pendientes': () => ({ data: [pendientes[0]] }),
      'POST /solicitudes-recursos/1/dictamen': () => ({ mensaje: 'Solicitud dictaminada.', data: { id: 1 } }),
    });

    await page.goto('/autorizaciones');
    await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
    await page.getByLabel(/Justificación del rechazo/).fill('El presupuesto no detalla el costo por unidad');
    await page.getByRole('button', { name: 'Rechazar solicitud' }).click();

    await expect(page.getByText('Solicitud rechazada.')).toBeVisible();
    expect(sesion.llamadasA('POST', '/solicitudes-recursos/1/dictamen')[0].cuerpo).toMatchObject({
      resultado: 'RECHAZADA',
      accion_rechazo: 'DEVOLVER_DIAGNOSTICO',
      justificacion: 'El presupuesto no detalla el costo por unidad',
    });
  });

  test('[KAN-256] un error 403 del servidor se informa sin cerrar el panel', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R05', {
      'GET /autorizaciones/pendientes': () => ({ data: [pendientes[0]] }),
      'POST /solicitudes-recursos/1/dictamen': () => ({ status: 403, body: { title: 'Forbidden', status: 403, detail: 'El costo estimado supera el tope de autoridad delegada.' } }),
    });

    await page.goto('/autorizaciones');
    await page.getByRole('button', { name: 'Aprobar solicitud' }).click();

    await expect(page.getByText(/supera el tope de autoridad delegada/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar solicitud' })).toBeVisible();
  });

  test('[KAN-251] sin solicitudes pendientes se muestra el estado vacío', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R05', { 'GET /autorizaciones/pendientes': () => ({ data: [] }) });

    await page.goto('/autorizaciones');

    await expect(page.getByText('Sin solicitudes por dictaminar')).toBeVisible();
  });

  test('[KAN-256] el técnico (R04) no accede a las autorizaciones', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R04');

    await page.goto('/autorizaciones');

    await expect(page.getByRole('heading', { name: 'Esta sección no está disponible para tu rol' })).toBeVisible();
  });
});
