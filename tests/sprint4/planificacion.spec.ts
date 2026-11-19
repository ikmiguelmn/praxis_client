import { expect, test } from '@playwright/test';
import { filaIncidencia, iniciarSesionSimulada, paginado } from './fixtures/sesion';

/**
 * QA Sprint 4: panel de planificación del coordinador (R03).
 * KAN-216 (asignación), KAN-221 (capacidad WIP) y KAN-226 (decisión de diagnóstico).
 * Solo humo con API simulada: la lógica de negocio se prueba en el backend (Pest).
 */

const E05 = { codigo: 'E05', nombre: 'Pendiente de asignación' };
const E07 = { codigo: 'E07', nombre: 'En diagnóstico' };

function consolaSegunEstado(peticion: import('@playwright/test').Request) {
  const estado = new URL(peticion.url()).searchParams.get('estado');
  if (estado === 'E05') {
    return paginado([filaIncidencia('inc-e05', 'TKT-2026-000501', E05)]);
  }
  if (estado === 'E07') {
    return paginado([filaIncidencia('inc-e07', 'TKT-2026-000707', E07)]);
  }

  return paginado([]);
}

test.describe('planificación (R03)', () => {
  test('[KAN-216] la pestaña Por asignar lista la incidencia E05 con acción Asignar hacia su ficha', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R03', {
      'GET /consola/incidencias': consolaSegunEstado,
      'GET /tecnicos/disponibles': () => ({ data: [] }),
    });

    await page.goto('/planificacion');

    await expect(page.getByRole('heading', { name: 'Panel de control operativo' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Por asignar/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('link', { name: 'TKT-2026-000501' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Asignar' })).toHaveAttribute('href', '/incidencias/inc-e05');
    expect(sesion.sinSimular).toEqual([]);
  });

  test('[KAN-221] el estado de cuadrillas marca saturado al técnico que alcanzó su límite WIP', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R03', {
      'GET /consola/incidencias': () => paginado([]),
      'GET /tecnicos/disponibles': () => ({
        data: [
          { id: 1, nombre: 'Tecnico Saturado', email: 'a@example.test', especialidades: [{ id: 1, codigo: 'CERRAJERIA', nombre: 'Cerrajería' }], carga_actual: 5, limite_wip: 5, disponible: false },
          { id: 2, nombre: 'Tecnico Libre', email: 'b@example.test', especialidades: [{ id: 1, codigo: 'CERRAJERIA', nombre: 'Cerrajería' }], carga_actual: 0, limite_wip: 5, disponible: true },
        ],
      }),
    });

    await page.goto('/planificacion');

    await expect(page.getByText('2 técnicos activos')).toBeVisible();
    await expect(page.getByText('1 saturados')).toBeVisible();
    await expect(page.getByText('1 libres')).toBeVisible();
    await expect(page.getByText('Capacidad máxima')).toBeVisible();
    await expect(page.getByText('5/5')).toBeVisible();
    await expect(page.getByText('Ocupación global')).toBeVisible();
    await expect(page.getByText('50%')).toBeVisible();
  });

  test('[KAN-226] la pestaña Decisión de diagnóstico consulta E07 y ofrece Revisar', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R03', {
      'GET /consola/incidencias': consolaSegunEstado,
      'GET /tecnicos/disponibles': () => ({ data: [] }),
    });

    await page.goto('/planificacion');
    await page.getByRole('tab', { name: /Decisión de diagnóstico/ }).click();

    await expect(page.getByRole('link', { name: 'TKT-2026-000707' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Revisar' })).toHaveAttribute('href', '/incidencias/inc-e07');
    expect(sesion.llamadasA('GET', '/consola/incidencias').some((l) => l.consulta.get('estado') === 'E07')).toBe(true);
  });

  test('[KAN-216] la etapa sin incidencias muestra el estado vacío', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R03', {
      'GET /consola/incidencias': () => paginado([]),
      'GET /tecnicos/disponibles': () => ({ data: [] }),
    });

    await page.goto('/planificacion');

    await expect(page.getByText('Nada pendiente en esta etapa')).toBeVisible();
  });

  test('[KAN-216] el técnico (R04) no accede al panel de planificación', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R04');

    await page.goto('/planificacion');

    await expect(page.getByRole('heading', { name: 'Esta sección no está disponible para tu rol' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Panel de control operativo' })).toHaveCount(0);
  });
});
