"use client";

import { useLayoutEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import AuthGuard from '@/lib/session/AuthGuard';
import { useOnline } from '@/lib/useOnline';
import GlobalSearch from './GlobalSearch';
import ModuleBar from './ModuleBar';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';
import { applyTheme, getTheme } from '@/lib/theme';
import Toaster from '@/components/ui/Toaster';
import ConfirmHost from '@/components/ui/ConfirmDialog';
import PageLoader from '@/components/ui/PageLoader';

function TopBar() {
  return (
    // z-[60]: por encima del velo y de la segunda barra, para que no se difumine y su menú de usuario no quede debajo.
    <div className="relative z-[60] border-b border-praxis-line bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-3 py-3 sm:gap-5 sm:px-6 lg:px-8">
        <Link href="/panel" className="flex shrink-0 items-center gap-3" aria-label="PRAXIS, ir al inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Logo2.png" alt="" className="h-9 w-9 object-contain" />
          <span className="hidden leading-tight md:block">
            <span className="block text-[15px] font-extrabold tracking-tight text-praxis-navy">PRAXIS</span>
            <span className="block text-[10px] font-semibold text-slate-500">Gestión de infraestructura</span>
          </span>
        </Link>
        <div className="mx-auto w-full min-w-0 max-w-xl flex-1">
          <GlobalSearch />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const online = useOnline();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="alert"
          className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          Sin conexión. Los cambios no se guardarán hasta que vuelvas a estar en línea.
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shell institucional con doble barra superior (HU-2.1, HU-2.2). */
/** Al entrar a la aplicación (tras el login o al abrirla) la vista arranca desde arriba. */
function ScrollToTopOnEnter() {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);
  return null;
}

export default function AppShell({ children }: { children: ReactNode }) {
  // El tema elegido solo aplica dentro de la aplicación; al salir (login, recuperación) se quita.
  useLayoutEffect(() => {
    applyTheme(getTheme());
    return () => applyTheme(null);
  }, []);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-praxis-surface text-slate-900">
        <ScrollToTopOnEnter />
        <header className="sticky top-0 z-30">
          <OfflineBanner />
          <TopBar />
          <ModuleBar />
        </header>
        <motion.main
          key={pathname}
          className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
        <Toaster />
        <ConfirmHost />
        <PageLoader />
      </div>
    </AuthGuard>
  );
}
