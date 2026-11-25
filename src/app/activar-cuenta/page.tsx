import { Suspense } from 'react';
import type { Metadata } from 'next';
import ActivateAccountFlow, { ActivateAccountFallback } from '@/components/auth/activation/ActivateAccountFlow';

// El token viaja en la URL: no se envía como Referer a otros sitios ni se indexa.
export const metadata: Metadata = {
  title: 'Activar cuenta | PRAXIS',
  description: 'Activa tu cuenta institucional y crea tu contraseña',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string | string[] }>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ActivateAccountFallback />}>
      <TokenActivation searchParams={searchParams} />
    </Suspense>
  );
}

async function TokenActivation({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  return <ActivateAccountFlow token={typeof token === 'string' ? token : ''} />;
}
