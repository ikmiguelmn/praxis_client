"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useSession } from '@/lib/session/SessionProvider';

/** Búsqueda por radicado o texto; abre la consola o Mis solicitudes según el rol activo. */
export default function GlobalSearch() {
  const router = useRouter();
  const { menu } = useSession();
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const canUseConsole = menu.some((item) => item.codigo === 'CONSOLA');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`${canUseConsole ? '/consola' : '/mis-solicitudes'}?q=${encodeURIComponent(q)}`);
    input.current?.blur();
  };

  return (
    <form noValidate onSubmit={submit} role="search" className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 sm:left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <label htmlFor="global-search" className="sr-only">
        Buscar por radicado o descripción
      </label>
      <input
        ref={input}
        id="global-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por radicado (TKT-…), aula o tipo de avería"
        className="h-10 w-full min-w-0 rounded-2xl border border-transparent bg-praxis-field pl-10 pr-3 sm:h-11 sm:pl-11 lg:pr-16 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-praxis-sky focus:bg-white focus:outline-none focus:ring-4 focus:ring-praxis-sky/15"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-400 lg:block">
        Ctrl K
      </kbd>
    </form>
  );
}
