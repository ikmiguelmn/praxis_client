import { expect, test } from '@playwright/test';
import { filaIncidencia, iniciarSesionSimulada, paginado } from './fixtures/sesion';

/**
 * QA Sprint 4: bandeja del técnico (R04).
 * KAN-231 (inspección y diagnóstico), KAN-241 (ejecución) y KAN-246 (suspensión).
 * Los formularios de diagnóstico, ejecución y suspensión viven en la ficha /incidencias/[id];
 * su detalle completo requiere un backend real y queda para el proyecto "integracion".
 */

const tareas = [
  filaIncidencia('t-e06', 'TKT-2026-000606', { codigo: 'E06', nombre: 'Pendiente de inspección' }),
  filaIncidencia('t-e07', 'TKT-2026-000707', { codigo: 'E07', nombre: 'En diagnóstico' }),
  filaIncidencia('t-e11', 'TKT-2026-001111', { codigo: 'E11', nombre: 'En atención' }),
  filaIncidencia('t-e18', 'TKT-2026-001818', { codigo: 'E18', nombre: 'Suspendida' }),
];

test.describe('mis tareas (R04)', () => {
  test('[KAN-231] agrupa las incidencias por etapa con la acción correspondiente', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R04', { 'GET /tecnico/tareas': () => paginado(tareas) });

    await page.goto('/mis-tareas');

    await expect(page.getByRole('heading', { name: /Por inspeccionar/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /TKT-2026-000606/ })).toContainText('Iniciar inspección');
    await expect(page.getByRole('link', { name: /TKT-2026-000707/ })).toContainText('Diagnosticar');
    await expect(page.getByRole('link', { name: /TKT-2026-001111/ })).toContainText('Registrar intervención');
    expect(sesion.sinSimular).toEqual([]);
  });

  test('[KAN-246] las incidencias suspendidas aparecen en su propio grupo', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R04', { 'GET /tecnico/tareas': () => paginado(tareas) });

    await page.goto('/mis-tareas');

    await expect(page.getByRole('heading', { name: /Suspendidas/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /TKT-2026-001818/ })).toContainText('Ver suspensión');
  });

  test('[KAN-241] cada tarjeta enlaza con la ficha de la incidencia', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R04', { 'GET /tecnico/tareas': () => paginado(tareas) });

    await page.goto('/mis-tareas');

    await expect(page.getByRole('link', { name: /TKT-2026-001111/ })).toHaveAttribute('href', '/incidencias/t-e11');
  });

  test('[KAN-231] sin tareas asignadas se muestra el estado vacío', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R04', { 'GET /tecnico/tareas': () => paginado([]) });

    await page.goto('/mis-tareas');

    await expect(page.getByText('No tienes tareas pendientes')).toBeVisible();
  });

  test('[KAN-231] el reportante (R01) no accede a la bandeja del técnico', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R01');

    await page.goto('/mis-tareas');

    await expect(page.getByRole('heading', { name: 'Esta sección no está disponible para tu rol' })).toBeVisible();
  });
});
