import { expect, test } from '@playwright/test';

/**
 * QA Sprint 4: integración front + backend local (opcional).
 * Se omite si no hay PRAXIS_QA_PASSWORD o PRAXIS_QA_EMAIL: en ese caso el resultado es
 * BLOCKED (ambiente), nunca PASS. Las credenciales se leen del entorno y no se guardan.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const correo = process.env.PRAXIS_QA_EMAIL;
const clave = process.env.PRAXIS_QA_PASSWORD;

test.describe('integración con backend local', () => {
  test.skip(!correo || !clave, 'BLOCKED: faltan PRAXIS_QA_EMAIL y PRAXIS_QA_PASSWORD en el entorno.');

  test('[KAN-216] el backend local responde su healthcheck', async ({ request }) => {
    const respuesta = await request.get(`${apiUrl}/up`);

    expect(respuesta.status()).toBe(200);
  });

  test('[KAN-216] un coordinador autenticado llega al panel de planificación', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/correo/i).fill(correo!);
    await page.getByLabel(/contraseña/i).first().fill(clave!);
    await page.getByRole('button', { name: /ingresar|iniciar sesión|acceder/i }).click();

    await expect(page).toHaveURL(/\/(planificacion|panel)/);
  });
});
