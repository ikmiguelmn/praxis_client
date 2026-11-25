"use client";

import { Suspense, useState } from 'react';
import AuthLayout from './AuthLayout';
import LoginNotice from './LoginNotice';
import LoginForm from './LoginForm';
import ResumeSession from './ResumeSession';
import { useSession } from '@/lib/session/SessionProvider';

export default function LoginPage() {
  // Next 16 puede devolver el login cacheado con el botón en "Bienvenido"; cada cierre de sesión
  // cambia la key para forzar un formulario limpio. La key no cambia al ingresar: si lo hiciera, el
  // formulario se reiniciaría y no se vería la animación de "Bienvenido".
  const { signedOut } = useSession();
  const [logouts, setLogouts] = useState(0);
  const [lastSignedOut, setLastSignedOut] = useState(signedOut);
  if (signedOut !== lastSignedOut) {
    setLastSignedOut(signedOut);
    if (signedOut) setLogouts((n) => n + 1);
  }

  return (
    <Suspense fallback={null}>
      <ResumeSession>
        <AuthLayout title="Acceso a la Plataforma" subtitle="Inicia sesión con tus credenciales institucionales">
          <Suspense fallback={null}>
            <LoginNotice />
          </Suspense>
          <LoginForm key={`login-${logouts}`} />
        </AuthLayout>
      </ResumeSession>
    </Suspense>
  );
}
