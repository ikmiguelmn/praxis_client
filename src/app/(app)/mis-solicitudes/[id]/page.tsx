import { Suspense } from 'react';
import type { Metadata } from 'next';
import RequestDetailView from '@/components/requests/RequestDetailView';
import FullscreenLoader from '@/components/ui/FullscreenLoader';

export const instant = false;

export const metadata: Metadata = { title: 'Detalle de solicitud | PRAXIS' };

type Params = Promise<{ id: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<FullscreenLoader label="Cargando solicitud" />}>
      <Resolve params={params} />
    </Suspense>
  );
}

async function Resolve({ params }: { params: Params }) {
  const { id } = await params;
  return <RequestDetailView id={id} />;
}
