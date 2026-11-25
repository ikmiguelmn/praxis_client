import api from './api';
import { apiStatus } from '@/lib/apiError';

export interface ActivationInfo {
  nombre?: string;
  email?: string;
}

export type ActivationCheck = { status: 'valid'; info: ActivationInfo } | { status: 'invalid' };

/**
 * Activación de cuenta para usuarios nuevos (HU-1.7). El correo de bienvenida trae un enlace a
 * `/activar-cuenta?token=...`; `validate` revisa que siga vigente y `activate` guarda la primera contraseña.
 */
export const accountActivationService = {
  /** GET /auth/activar-cuenta/{token}. 410 = enlace vencido, usado o inexistente. */
  validate: async (token: string): Promise<ActivationCheck> => {
    try {
      const { data } = await api.get<{ data?: ActivationInfo }>(`/auth/activar-cuenta/${encodeURIComponent(token)}`);
      return { status: 'valid', info: data?.data ?? {} };
    } catch (err) {
      const status = apiStatus(err);
      if (status === 410 || status === 404) return { status: 'invalid' };
      throw err;
    }
  },

  /** POST /auth/activar-cuenta. La cuenta pasa de "Pendiente de activación" a "Activo". */
  activate: async (payload: { token: string; password: string; password_confirmation: string }): Promise<string> => {
    const { data } = await api.post<{ mensaje?: string }>('/auth/activar-cuenta', payload);
    return data?.mensaje ?? '';
  },
};
