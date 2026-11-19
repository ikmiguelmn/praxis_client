"use client";

import { Suspense } from 'react';
import AuthLayout from './AuthLayout';
import LoginNotice from './LoginNotice';
import LoginForm from './LoginForm';
import { useSession } from '@/lib/session/SessionProvider';

export default function LoginPage() {
  // Next 16 puede devolver el login cacheado con el botón en "Bienvenido"; al cerrar sesión
  // cambiamos la key para forzar un formulario limpio.
  const { signedOut } = useSession();

  return (
    <AuthLayout title="Acceso a la Plataforma" subtitle="Inicia sesión con tus credenciales institucionales">
      <Suspense fallback={null}>
        <LoginNotice />
      </Suspense>
      <LoginForm key={signedOut ? 'after-logout' : 'login'} />
    </AuthLayout>
  );
}
