"use client";

import { Suspense } from 'react';
import AuthLayout from './AuthLayout';
import LoginNotice from './LoginNotice';
import LoginForm from './LoginForm';
import ResumeSession from './ResumeSession';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <ResumeSession>
        <AuthLayout title="Acceso a la Plataforma" subtitle="Inicia sesión con tus credenciales institucionales">
          <Suspense fallback={null}>
            <LoginNotice />
          </Suspense>
          <LoginForm />
        </AuthLayout>
      </ResumeSession>
    </Suspense>
  );
}
