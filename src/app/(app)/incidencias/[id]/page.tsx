import { Suspense } from 'react';
import type { Metadata } from 'next';
import OperationalDetailView from '@/components/ops/OperationalDetailView';
import FullscreenLoader from '@/components/ui/FullscreenLoader';

export const instant = false;

export const metadata: Metadata = { title: 'Ficha de incidencia | PRAXIS' };

type Params = Promise<{ id: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<FullscreenLoader label="Cargando ficha" />}>
      <Resolve params={params} />
    </Suspense>
  );
}

async function Resolve({ params }: { params: Params }) {
  const { id } = await params;
  return <OperationalDetailView id={id} />;
}
