import { expect, test, type Page } from '@playwright/test';
import { iniciarSesionSimulada, type CodigoRol, type Manejador } from './fixtures/sesion';
import { diagnostico, ESTADOS, fichaOperativa, OTRO_TECNICO, solicitudPendiente } from './fixtures/ficha';

/**
 * QA Sprint 4: acciones de la ficha de incidencia (/incidencias/[id]) con API simulada.
 * KAN-231, KAN-236, KAN-241, KAN-246, KAN-251 y KAN-261. Cubre la interfaz; las reglas de
 * negocio se prueban en el backend (Pest). Los datos y la sesión son ficticios.
 */

type Estado = keyof typeof ESTADOS;

async function abrirFicha(page: Page, rol: CodigoRol, estado: Estado, extra: Record<string, unknown> = {}, manejadores: Record<string, Manejador> = {}) {
  const sesion = await iniciarSesionSimulada(page, rol, {
    'GET /incidencias/inc-ficha': () => ({ data: fichaOperativa(ESTADOS[estado], extra) }),
    'GET /incidencias/inc-ficha/historial': () => ({ data: [] }),
    ...manejadores,
  });
  await page.goto('/incidencias/inc-ficha');
  await expect(page.getByRole('heading', { name: 'Cerradura del aula 101 no cierra' })).toBeVisible();

  return sesion;
}

test.describe('ficha: técnico (R04)', () => {
  test('[KAN-231] el técnico asignado ve Iniciar inspección en E06', async ({ page }) => {
    await abrirFicha(page, 'R04', 'E06');

    await expect(page.getByRole('button', { name: /Iniciar inspección/ })).toBeVisible();
  });

  test('[KAN-231] un técnico no asignado no ve las acciones de inspección', async ({ page }) => {
    await abrirFicha(page, 'R04', 'E06', { tecnico_asignado: OTRO_TECNICO });

    await expect(page.getByRole('button', { name: /Iniciar inspección/ })).toHaveCount(0);
  });

  test('[KAN-231] el diagnóstico con campos cortos se bloquea sin llamar al servidor', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R04', 'E07');

    await page.getByRole('button', { name: /Registrar diagnóstico/ }).click();
    await page.getByLabel(/Hallazgos en sitio/).fill('corto');
    await page.getByLabel(/Descripción del problema/).fill('corto');
    await page.getByLabel(/Intervención propuesta/).fill('corto');
    await page.getByRole('button', { name: 'Enviar diagnóstico' }).click();

    await expect(page.getByText('Hallazgos, problema e intervención propuesta requieren al menos 10 caracteres.')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/diagnostico')).toHaveLength(0);
  });

  test('[KAN-231] el diagnóstico completo envía hallazgos y propuesta', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R04', 'E07', {}, { 'POST /incidencias/inc-ficha/diagnostico': () => ({ mensaje: 'Diagnóstico registrado.', data: { id: 'inc-ficha' } }) });

    await page.getByRole('button', { name: /Registrar diagnóstico/ }).click();
    await page.getByLabel(/Hallazgos en sitio/).fill('Cilindro desgastado y pasador roto.');
    await page.getByLabel(/Descripción del problema/).fill('Desgaste del mecanismo por uso continuo.');
    await page.getByLabel(/Intervención propuesta/).fill('Reemplazo del cilindro completo.');
    await page.getByRole('button', { name: 'Enviar diagnóstico' }).click();

    await expect(page.getByText('Diagnóstico registrado y enviado a coordinación.')).toBeVisible();
    const envios = sesion.llamadasA('POST', '/incidencias/inc-ficha/diagnostico');
    expect(envios).toHaveLength(1);
    expect(envios[0].cuerpo).toMatchObject({ hallazgos: 'Cilindro desgastado y pasador roto.', intervencion_propuesta: 'Reemplazo del cilindro completo.' });
  });

  test('[KAN-231] con el diagnóstico enviado el técnico espera la decisión de coordinación', async ({ page }) => {
    await abrirFicha(page, 'R04', 'E07', { diagnosticos: [diagnostico()] });

    await expect(page.getByText('Diagnóstico enviado. Espera la decisión de coordinación.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Registrar diagnóstico/ })).toHaveCount(0);
  });

  test('[KAN-236] el descarte exige textos mínimos y una foto del estado funcional', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R04', 'E07');

    await page.getByRole('button', { name: /No se confirmó el daño/ }).click();
    await page.getByRole('button', { name: 'Enviar descarte' }).click();
    await expect(page.getByText('Hallazgos (mín. 10) y justificación (mín. 20) son obligatorios.')).toBeVisible();

    await page.getByLabel(/Hallazgos/).fill('El tomacorriente opera con normalidad.');
    await page.getByLabel(/Justificación del descarte/).fill('Se midió voltaje estable durante la visita técnica.');
    await page.getByRole('button', { name: 'Enviar descarte' }).click();
    await expect(page.getByText('Adjunta al menos una foto que muestre el estado funcional.')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/descartar-por-inspeccion')).toHaveLength(0);
  });

  test('[KAN-241] el cronómetro de E11 muestra el tiempo transcurrido', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('praxis.cronometro.inc-ficha', String(Date.now() - 65_000));
      } catch {
        // sin almacenamiento
      }
    });
    await abrirFicha(page, 'R04', 'E11');

    await expect(page.getByText('Tiempo en atención')).toBeVisible();
    await expect(page.getByText(/^00:01:\d{2}$/)).toBeVisible();
  });

  test('[KAN-241] registrar la intervención exige actividades, tiempo y fotos (RN-032, RN-033)', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R04', 'E11');

    await page.getByRole('button', { name: /Registrar intervención/ }).click();
    await page.getByRole('button', { name: 'Registrar y enviar a verificación' }).click();
    await expect(page.getByText('Describe las actividades realizadas (mínimo 10 caracteres).')).toBeVisible();

    await page.getByLabel(/Actividades realizadas/).fill('Se cambió la chapa y se ajustaron las bisagras.');
    await page.getByRole('button', { name: 'Registrar y enviar a verificación' }).click();
    await expect(page.getByText('Indica el tiempo invertido en minutos.')).toBeVisible();

    await page.getByLabel(/Tiempo invertido/).fill('45');
    await page.getByRole('button', { name: 'Registrar y enviar a verificación' }).click();
    await expect(page.getByText('Adjunta al menos una foto del trabajo terminado (RN-033).')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/registrar-intervencion')).toHaveLength(0);
  });

  test('[KAN-241] en E10 el técnico ve Iniciar atención', async ({ page }) => {
    await abrirFicha(page, 'R04', 'E10');

    await expect(page.getByRole('button', { name: /Iniciar atención/ })).toBeVisible();
  });
});

test.describe('ficha: coordinación (R03)', () => {
  test('[KAN-226] con un diagnóstico sin recursos ofrece Aprobar y programar y Devolver', async ({ page }) => {
    await abrirFicha(page, 'R03', 'E07', { diagnosticos: [diagnostico()] });

    await expect(page.getByRole('button', { name: /Aprobar y programar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Devolver diagnóstico/ })).toBeVisible();
  });

  test('[KAN-226] un diagnóstico descartado ofrece Validar descarte y cerrar y no Aprobar', async ({ page }) => {
    await abrirFicha(page, 'R03', 'E07', { diagnosticos: [diagnostico({ incidencia_confirmada: false, justificacion_no_confirmada: 'Opera con normalidad.' })] });

    await expect(page.getByRole('button', { name: /Validar descarte y cerrar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Aprobar y programar/ })).toHaveCount(0);
  });

  test('[KAN-246] suspender exige causa, motivo y condiciones', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R03', 'E11');

    await page.getByRole('button', { name: /Suspender atención/ }).click();
    await page.getByRole('button', { name: 'Suspender', exact: true }).click();
    await expect(page.getByText('Elige la causa de la suspensión.')).toBeVisible();

    await page.getByRole('button', { name: 'Demora de proveedor' }).click();
    await page.getByRole('button', { name: 'Suspender', exact: true }).click();
    await expect(page.getByText('Describe el motivo y las condiciones para reanudar (mínimo 10 caracteres cada uno).')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/suspender')).toHaveLength(0);
  });

  test('[KAN-246] suspender con datos completos envía la causal y las condiciones', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R03', 'E11', {}, { 'POST /incidencias/inc-ficha/suspender': () => ({ mensaje: 'Atención suspendida.', data: { id: 'inc-ficha' } }) });

    await page.getByRole('button', { name: /Suspender atención/ }).click();
    await page.getByRole('button', { name: 'Demora de proveedor' }).click();
    await page.getByLabel(/Motivo detallado/).fill('El proveedor no entregó el repuesto a tiempo');
    await page.getByLabel(/Condiciones para reanudar/).fill('Cuando el proveedor entregue el repuesto en bodega');
    await page.getByRole('button', { name: 'Suspender', exact: true }).click();

    await expect(page.getByText('Atención suspendida y comunicada al reportante.')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/suspender')[0].cuerpo).toMatchObject({ causal: 'PROVEEDOR' });
  });

  test('[KAN-246] reanudar exige una observación de al menos 10 caracteres', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R03', 'E18');

    await page.getByRole('button', { name: /Reanudar atención/ }).click();
    await page.getByLabel(/Observación/).fill('corto');
    await page.getByRole('button', { name: 'Reanudar', exact: true }).click();

    await expect(page.getByText('La observación debe tener al menos 10 caracteres.')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/reanudar')).toHaveLength(0);
  });

  test('[KAN-246] un técnico (R04) no ve Reanudar atención', async ({ page }) => {
    await abrirFicha(page, 'R04', 'E18');

    await expect(page.getByRole('button', { name: /Reanudar atención/ })).toHaveCount(0);
  });

  test('[KAN-251] solicitar recursos valida la decisión requerida', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R03', 'E07', { diagnosticos: [diagnostico({ requiere_recursos: true, requiere_autorizacion: true })] });

    await page.getByRole('button', { name: /Solicitar recursos/ }).click();
    await page.getByLabel(/Decisión requerida/).fill('corta');
    await page.getByRole('button', { name: /Enviar a autorización|Registrar solicitud/ }).click();

    await expect(page.getByText('Describe la decisión requerida (mínimo 10 caracteres).')).toBeVisible();
    expect(sesion.llamadasA('POST', '/incidencias/inc-ficha/solicitudes-recursos')).toHaveLength(0);
  });

  test('[KAN-251] sin recursos en el diagnóstico no se ofrece Solicitar recursos', async ({ page }) => {
    await abrirFicha(page, 'R03', 'E07', { diagnosticos: [diagnostico({ requiere_recursos: false })] });

    await expect(page.getByRole('button', { name: /Solicitar recursos/ })).toHaveCount(0);
  });

  test('[KAN-261] en E09 ofrece confirmar recursos, nota de seguimiento y anular', async ({ page }) => {
    await abrirFicha(page, 'R03', 'E09', { solicitudes_recursos: [solicitudPendiente()] });

    await expect(page.getByRole('button', { name: /Confirmar recursos y programar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nota de seguimiento/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Anular incidencia/ })).toBeVisible();
  });

  test('[KAN-261] confirmar y programar permanece bloqueado hasta marcar todos los recursos como recibidos', async ({ page }) => {
    const sesion = await abrirFicha(page, 'R03', 'E09', { solicitudes_recursos: [solicitudPendiente()] });

    await page.getByRole('button', { name: /Confirmar recursos y programar/ }).click();
    const confirmar = page.getByRole('button', { name: 'Confirmar y programar' });
    await expect(confirmar).toBeDisabled();

    await page.getByRole('checkbox', { name: /Cerradura multipunto/ }).check();
    await expect(confirmar).toBeEnabled();

    await confirmar.click();
    expect(sesion.llamadasA('PATCH', '/incidencias/inc-ficha/confirmar-recursos')).toHaveLength(0);
  });

  test('[KAN-261] el técnico (R04) no ve las acciones de recursos', async ({ page }) => {
    await abrirFicha(page, 'R04', 'E09', { solicitudes_recursos: [solicitudPendiente()] });

    await expect(page.getByRole('button', { name: /Confirmar recursos y programar/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Anular incidencia/ })).toHaveCount(0);
  });
});
