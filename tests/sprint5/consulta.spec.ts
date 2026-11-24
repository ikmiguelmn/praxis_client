import { expect, test } from '@playwright/test';
import { filaIncidencia, iniciarSesionSimulada, paginado, type ModuloSimulado } from '../sprint4/fixtures/sesion';

/**
 * QA Sprint 5: consola, plazos SLA e indicadores (E10) con API simulada.
 * KAN-301 (HU-10.1), KAN-311 (HU-10.3) y KAN-316 (HU-10.4).
 * Las reglas de negocio se prueban en el backend (Pest, tests/Feature/Sprint5).
 */

const MODULOS_CONSULTA: ModuloSimulado[] = [
  { codigo: 'CONSOLA', etiqueta: 'Consola de incidencias', ruta: '/consola' },
  { codigo: 'PLAZOS', etiqueta: 'Plazos SLA', ruta: '/consola/plazos' },
  { codigo: 'INDICADORES', etiqueta: 'Indicadores', ruta: '/consola/indicadores' },
];

const E11 = { codigo: 'E11', nombre: 'En atención' };
const E15 = { codigo: 'E15', nombre: 'Cerrada' };

function sla(estado: string, extra: Record<string, unknown> = {}) {
  return { estado, color: 'gris', porcentaje_consumido: 10, minutos_restantes: null, horas_retraso: null, fecha_limite: new Date(Date.now() + 86_400_000).toISOString(), ...extra };
}

function metricas(extra: Record<string, unknown> = {}) {
  const ahora = new Date().toISOString();
  return {
    data: {
      periodo: { desde: ahora, hasta: ahora },
      sin_datos: false,
      total_incidencias: 4,
      por_estado: [
        { codigo: 'E11', nombre: 'En atención', total: 3 },
        { codigo: 'E15', nombre: 'Cerrada', total: 1 },
      ],
      por_prioridad: { ALTA: 4 },
      mttr: { incidencias_cerradas: 1, horas_promedio: 14.2, texto: 'Tiempo promedio: 14.2 horas' },
      cumplimiento_sla: { evaluadas: 1, cumplidas: 1, porcentaje: 100 },
      fallas_recurrentes: {
        ventana_dias: 30,
        minimo_reportes: 3,
        data: [{ espacio_fisico_id: 7, espacio: 'Laboratorio de Química 201', categoria_id: 2, categoria: 'Hidrosanitaria', reportes: 4, ultimo_reporte: ahora }],
      },
      ...extra,
    },
  };
}

test.describe('consola de incidencias (KAN-301)', () => {
  test('[KAN-301] lista las incidencias con código, estado y tiempo de atención para el coordinador', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(
      page,
      'R03',
      {
        'GET /consola/incidencias': () =>
          paginado([
            filaIncidencia('inc-1', 'TKT-2026-000101', E11, { sla: sla('EN_PLAZO'), tiempo_atencion: { horas: 12, en_curso: true, texto: '12 horas' } }),
            filaIncidencia('inc-2', 'TKT-2026-000102', E15, { fecha_cierre: new Date().toISOString(), tiempo_atencion: { horas: 32, en_curso: false, texto: '32 horas' } }),
          ]),
      },
      { modulos: MODULOS_CONSULTA },
    );

    await page.goto('/consola');

    await expect(page.getByRole('heading', { name: 'Consola de incidencias' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'TKT-2026-000101' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'TKT-2026-000102' })).toBeVisible();
    expect(sesion.sinSimular).toEqual([]);
  });

  test('[KAN-301] la búsqueda textual consulta al servidor por el término escrito (Escenario 3)', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R02', { 'GET /consola/incidencias': () => paginado([]) }, { modulos: MODULOS_CONSULTA });

    await page.goto('/consola');
    await page.getByRole('searchbox', { name: 'Buscar', exact: true }).fill('TKT-2026-000555');

    await expect.poll(() => sesion.llamadasA('GET', '/consola/incidencias').map((l) => l.consulta.get('q'))).toContain('TKT-2026-000555');
  });

  test('[KAN-301] sin coincidencias muestra un estado controlado con un botón para restablecer la vista (Escenario 3)', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(
      page,
      'R02',
      { 'GET /consola/incidencias': (peticion) => paginado(new URL(peticion.url()).searchParams.get('q') ? [] : [filaIncidencia('inc-1', 'TKT-2026-000101', E11)]) },
      { modulos: MODULOS_CONSULTA },
    );

    await page.goto('/consola?q=no-existe');

    await expect(page.getByRole('heading', { name: /Sin resultados/ })).toBeVisible();
    await page.getByRole('button', { name: 'Restablecer vista' }).click();
    await expect(page.getByRole('link', { name: 'TKT-2026-000101' })).toBeVisible();
    expect(sesion.sinSimular).toEqual([]);
  });

  test('[KAN-301] el filtro de estado se envía combinado al servidor (Escenario 2)', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(
      page,
      'R03',
      {
        'GET /consola/incidencias': () => paginado([]),
        'GET /catalogo/ubicaciones/arbol-activo': () => ({ data: [] }),
        'GET /catalogo/categorias': () => ({ data: [] }),
      },
      { modulos: MODULOS_CONSULTA },
    );

    await page.goto('/consola?prioridad=ALTA');
    await page.getByRole('button', { name: /Filtros/ }).click();
    await page.getByRole('button', { name: 'En atención' }).click();

    await expect
      .poll(() => sesion.llamadasA('GET', '/consola/incidencias').some((l) => l.consulta.get('estado') === 'E11' && l.consulta.get('prioridad') === 'ALTA'))
      .toBe(true);
  });

  test('[KAN-301] el reportante (R01) no ve la consola y termina en /mis-solicitudes (Escenario 5)', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R01', {
      'GET /mis-solicitudes': () => paginado([]),
    });

    await page.goto('/consola');

    // La vista muestra el aviso de rol con una cuenta regresiva de 3 s antes de redirigir.
    await expect(page).toHaveURL(/\/mis-solicitudes/, { timeout: 10_000 });
    expect(sesion.llamadasA('GET', '/consola/incidencias')).toEqual([]);
  });
});

test.describe('plazos SLA (KAN-311)', () => {
  test('[KAN-311] muestra los totales por semáforo, las horas restantes y el retraso de las vencidas', async ({ page }) => {
    await iniciarSesionSimulada(
      page,
      'R03',
      {
        'GET /consola/plazos': () => ({
          resumen: { en_plazo: 1, proximas_a_vencer: 0, vencidas: 1 },
          data: [
            filaIncidencia('inc-v', 'TKT-2026-000901', E11, { sla: sla('VENCIDA', { porcentaje_consumido: 120, minutos_restantes: 0, horas_retraso: 5 }) }),
            filaIncidencia('inc-p', 'TKT-2026-000902', E11, { sla: sla('EN_PLAZO', { porcentaje_consumido: 25, minutos_restantes: 2160 }) }),
          ],
        }),
      },
      { modulos: MODULOS_CONSULTA },
    );

    await page.goto('/consola/plazos');

    await expect(page.getByRole('heading', { name: 'Semáforo de plazos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vencidas\s*1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /En plazo\s*1/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /TKT-2026-000901/ })).toContainText('+5h 00m');
    await expect(page.getByRole('link', { name: /TKT-2026-000902/ })).toContainText('36h 00m');
  });

  test('[KAN-311] filtrar por "Vencidas" consulta el servidor con estado_sla=VENCIDA (Escenario 3)', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(
      page,
      'R02',
      { 'GET /consola/plazos': () => ({ resumen: { en_plazo: 0, proximas_a_vencer: 0, vencidas: 0 }, data: [] }) },
      { modulos: MODULOS_CONSULTA },
    );

    await page.goto('/consola/plazos');
    await page.getByRole('button', { name: /Vencidas/ }).click();

    await expect.poll(() => sesion.llamadasA('GET', '/consola/plazos').map((l) => l.consulta.get('estado_sla'))).toContain('VENCIDA');
  });
});

test.describe('indicadores (KAN-316)', () => {
  test('[KAN-316] muestra MTTR y la alerta de falla recurrente del espacio (Escenarios 2 y 3)', async ({ page }) => {
    await iniciarSesionSimulada(page, 'R03', { 'GET /analitica/metricas-basicas': () => metricas() }, { modulos: MODULOS_CONSULTA });

    await page.goto('/consola/indicadores');

    await expect(page.getByRole('heading', { name: 'Indicadores de gestión' })).toBeVisible();
    await expect(page.getByText(/14[.,]2/).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Laboratorio de Química 201' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Hidrosanitaria' })).toBeVisible();
  });

  test('[KAN-316] cambiar el periodo a Semestre vuelve a consultar con periodo=semestre (Escenario 4)', async ({ page }) => {
    const sesion = await iniciarSesionSimulada(page, 'R06', { 'GET /analitica/metricas-basicas': () => metricas() }, { modulos: MODULOS_CONSULTA });

    await page.goto('/consola/indicadores');
    await page.getByRole('tab', { name: 'Semestre' }).click();

    await expect(page.getByRole('tab', { name: 'Semestre' })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => sesion.llamadasA('GET', '/analitica/metricas-basicas').map((l) => l.consulta.get('periodo'))).toContain('semestre');
  });

  test('[KAN-316] un periodo sin registros muestra el estado sin información y no un error (Escenario 5)', async ({ page }) => {
    await iniciarSesionSimulada(
      page,
      'R02',
      {
        'GET /analitica/metricas-basicas': () =>
          metricas({
            sin_datos: true,
            total_incidencias: 0,
            por_estado: [],
            por_prioridad: {},
            mttr: { incidencias_cerradas: 0, horas_promedio: null, texto: 'Sin información en el periodo seleccionado' },
            cumplimiento_sla: { evaluadas: 0, cumplidas: 0, porcentaje: null },
            fallas_recurrentes: { ventana_dias: 30, minimo_reportes: 3, data: [] },
          }),
      },
      { modulos: MODULOS_CONSULTA },
    );

    await page.goto('/consola/indicadores');

    await expect(page.getByRole('heading', { name: /Sin información en el periodo/ })).toBeVisible();
    await expect(page.getByText(/NaN|Infinity|undefined/)).toHaveCount(0);
  });
});
