"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft,ChevronRight, Clock, KeyRound, Lock, Pencil, Search, Send, ShieldCheck, UserPlus, UserRoundCheck, UserRoundX, Users, Wrench } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import ReasonDialog from '@/components/ui/ReasonDialog';
import { EmptyState, QueryBoundary } from '@/components/ui/States';
import { ToneBadge } from '@/components/ui/Badges';
import { toast } from '@/components/ui/Toaster';
import { FormError, useSubmit } from '@/components/ops/actions/ActionKit';
import { adminService, type AdminUser } from '@/services/adminService';
import { useApiQuery } from '@/lib/useApiQuery';
import { useModuleAccess, useSession } from '@/lib/session/SessionProvider';
import { confirmAction } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/apiError';
import { PASSWORD_RULES, POLICY_MESSAGE, meetsPolicy, passedRules } from '@/lib/passwordPolicy';
import { formatRelative, initials } from '@/lib/format';
import type { RoleCode } from '@/types/auth';
import ReadOnlyNotice from './ReadOnlyNotice';

/** Rol que ejecuta intervenciones de campo: el único que lleva especialidades técnicas (HU-11.5). */
const TECNICO: RoleCode = 'R04';
const SPECIALTY_REQUIRED = 'Selecciona al menos una especialidad técnica para el rol Técnico de mantenimiento.';

const ROLE_TONES: Record<string, 'azul' | 'violeta' | 'cian' | 'naranja' | 'amarillo' | 'verde' | 'rojo'> = {
  R01: 'azul', R02: 'violeta', R03: 'cian', R04: 'naranja', R05: 'amarillo', R06: 'verde', R07: 'rojo',
};

/** Administración de usuarios y asignación de roles (HU-1.2, KAN-287). */
export default function UsersView() {
  const readOnly = useModuleAccess('ADMIN_USUARIOS') === 'LECTURA';
  const { profile } = useSession();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [rol, setRol] = useState('');
  const [activo, setActivo] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [rolesFor, setRolesFor] = useState<AdminUser | null>(null);
  const [stateFor, setStateFor] = useState<AdminUser | null>(null);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const list = useApiQuery(`admin:usuarios:${q}:${rol}:${activo}:${page}`, () => adminService.users({ q, rol, activo, page }));
  const roles = useApiQuery('admin:roles', adminService.roles);
  const done = (message: string) => {
    toast(message);
    void list.reload();
  };

  const resendInvitation = async (u: AdminUser) => {
    const ok = await confirmAction({
      tone: 'primary',
      icon: 'question',
      title: `¿Reenviar la invitación a ${u.nombre}?`,
      description: `Enviaremos un nuevo correo de bienvenida a ${u.email}. El enlace anterior dejará de funcionar.`,
      confirmLabel: 'Reenviar invitación',
    });
    if (!ok) return;
    try {
      await adminService.resendActivation(u.id);
      toast(`Enviamos un nuevo enlace de activación a ${u.email}.`, 'success', 'Invitación reenviada');
    } catch (err) {
      toast(apiErrorMessage(err, 'No se pudo reenviar la invitación.'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Administración' }, { label: 'Usuarios y roles' }]}
        title="Usuarios y roles"
        description="Cuentas de la comunidad y del equipo operativo, sus roles según la matriz RACI y sus especialidades técnicas."
        actions={
          !readOnly && (
            <button type="button" onClick={() => setEditing('new')} className="btn-primary">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Nuevo usuario
            </button>
          )
        }
      />
      {readOnly && <ReadOnlyNotice />}

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-praxis-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" aria-label="Buscar usuario" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o correo" className="field h-11 pl-10" />
          </div>
          <select aria-label="Filtrar por rol" className="field h-11 lg:w-56" value={rol} onChange={(e) => { setRol(e.target.value); setPage(1); }}>
            <option value="">Todos los roles</option>
            {roles.data?.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}
          </select>
          <div className="inline-flex rounded-xl bg-praxis-field p-1" role="group" aria-label="Estado">
            {[
              ['', 'Todos'],
              ['1', 'Activos'],
              ['0', 'Inactivos'],
            ].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={activo === v} onClick={() => { setActivo(v); setPage(1); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${activo === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <QueryBoundary loading={list.initialLoading} error={list.error} onRetry={list.reload} label="Cargando usuarios">
          {list.data && list.data.data.length === 0 ? (
            <EmptyState icon={<Users className="h-7 w-7" />} title="Sin usuarios" description="Ningún usuario coincide con la búsqueda o los filtros." />
          ) : (
            list.data && (
              <div className={`overflow-x-auto ${list.loading ? 'opacity-60' : ''}`}>
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-praxis-line text-left text-[11px] font-semibold text-slate-500">
                      <th className="px-5 py-3">Usuario</th>
                      <th className="px-3 py-3">Roles</th>
                      <th className="px-3 py-3">Especialidades</th>
                      <th className="px-3 py-3">Último acceso</th>
                      <th className="px-3 py-3">Estado</th>
                      {!readOnly && <th className="px-5 py-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((u, i) => (
                      <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${u.activo ? '' : 'opacity-60'}`}>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-praxis-navy text-[11px] font-bold text-white">{initials(u.nombre)}</span>
                            <span>
                              <span className="block font-semibold text-slate-900">{u.nombre}</span>
                              <span className="block text-xs text-slate-500">{u.email}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <ToneBadge key={r.codigo} tone={ROLE_TONES[r.codigo] ?? 'gris'} dot={false}>
                                {r.nombre}
                              </ToneBadge>
                            ))}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">{u.especialidades.map((e) => e.nombre).join(', ') || '—'}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{u.ultimo_acceso_en ? formatRelative(u.ultimo_acceso_en) : 'Nunca'}</td>
                        <td className="px-3 py-3">
                          {u.pendiente_activacion ? (
                            <ToneBadge tone="amarillo">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              Pendiente de activación
                            </ToneBadge>
                          ) : u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date() ? (
                            <ToneBadge tone="naranja">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Bloqueado
                            </ToneBadge>
                          ) : (
                            <ToneBadge tone={u.activo ? 'verde' : 'gris'}>{u.activo ? 'Activo' : 'Inactivo'}</ToneBadge>
                          )}
                        </td>
                        {!readOnly && (
                          <td className="px-5 py-3">
                            <span className="flex justify-end gap-1">
                              <IconBtn label="Editar datos" onClick={() => setEditing(u)} icon={<Pencil className="h-4 w-4" />} />
                              <IconBtn label="Cambiar roles" onClick={() => setRolesFor(u)} icon={<ShieldCheck className="h-4 w-4" />} />
                              {u.pendiente_activacion ? (
                                <IconBtn label="Reenviar invitación" onClick={() => void resendInvitation(u)} icon={<Send className="h-4 w-4" />} />
                              ) : (
                                u.activo && u.id !== profile?.id && <IconBtn label="Restablecer contraseña" onClick={() => setResetFor(u)} icon={<KeyRound className="h-4 w-4" />} />
                              )}
                              {u.id !== profile?.id && (
                                <IconBtn
                                  label={u.activo ? 'Inactivar' : 'Activar'}
                                  onClick={() => setStateFor(u)}
                                  icon={u.activo ? <UserRoundX className="h-4 w-4 text-red-500" /> : <UserRoundCheck className="h-4 w-4 text-emerald-600" />}
                                />
                              )}
                            </span>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-praxis-line px-5 py-3 text-sm text-slate-500">
                  <span>{list.data.meta.total} usuarios</span>
                  {list.data.meta.last_page > 1 && (
                    <span className="flex items-center gap-2">
                      <button type="button" className="btn-secondary px-2.5 py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Anterior">
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="font-semibold text-slate-700">{page} / {list.data.meta.last_page}</span>
                      <button type="button" className="btn-secondary px-2.5 py-1.5" disabled={page >= list.data.meta.last_page} onClick={() => setPage(page + 1)} aria-label="Siguiente">
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </QueryBoundary>
      </section>

      {editing && <UserDialog user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={done} />}
      {resetFor && <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} onDone={done} />}
      {rolesFor && <RolesDialog user={rolesFor} onClose={() => setRolesFor(null)} onDone={done} />}
      {stateFor && (
        <ReasonDialog
          open
          onClose={() => setStateFor(null)}
          icon={stateFor.activo ? <UserRoundX className="h-5 w-5 text-red-600" /> : <UserRoundCheck className="h-5 w-5" />}
          title={stateFor.activo ? `Inactivar a ${stateFor.nombre}` : `Activar a ${stateFor.nombre}`}
          description={stateFor.activo ? 'No podrá iniciar sesión. Su historial se conserva (borrado lógico).' : 'Podrá volver a iniciar sesión con sus roles actuales.'}
          label="Motivo"
          min={0}
          max={500}
          confirmLabel={stateFor.activo ? 'Inactivar' : 'Activar'}
          tone={stateFor.activo ? 'danger' : 'primary'}
          onSubmit={(motivo) => adminService.setUserState(stateFor.id, !stateFor.activo, motivo || undefined)}
          onDone={() => done(stateFor.activo ? 'Usuario inactivado.' : 'Usuario activado.')}
        />
      )}
    </div>
  );
}

function IconBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
      {icon}
    </button>
  );
}

/** Selector de especialidades; solo aparece cuando el usuario tendrá el rol Técnico de mantenimiento (HU-11.5). */
function SpecialtyPicker({ show, selected, onChange, invalid }: { show: boolean; selected: string[]; onChange: (next: string[]) => void; invalid?: boolean }) {
  const especialidades = useApiQuery('admin:especialidades', adminService.especialidades, { blocking: false });
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="especialidades"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <fieldset className={`rounded-2xl border p-4 ${invalid ? 'border-red-300 bg-red-50/40' : 'border-praxis-line'}`}>
            <legend className="field-label flex items-center gap-1.5 px-1">
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              Especialidades técnicas <span className="text-red-600" aria-hidden="true">*</span>
              <span className="sr-only">(obligatorio)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {especialidades.data?.filter((e) => e.activo).map((e) => (
                <button
                  key={e.codigo}
                  type="button"
                  aria-pressed={selected.includes(e.codigo)}
                  onClick={() => onChange(selected.includes(e.codigo) ? selected.filter((x) => x !== e.codigo) : [...selected, e.codigo])}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${selected.includes(e.codigo) ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
            <p className={`mt-2 text-[11px] ${invalid ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
              {invalid ? SPECIALTY_REQUIRED : 'Definen qué incidencias puede recibir el técnico. Elige al menos una.'}
            </p>
          </fieldset>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UserDialog({ user, onClose, onDone }: { user: AdminUser | null; onClose: () => void; onDone: (m: string) => void }) {
  const roles = useApiQuery('admin:roles', adminService.roles, { blocking: false });
  const [f, setF] = useState({ nombre: user?.nombre ?? '', email: user?.email ?? '', telefono: user?.telefono ?? '', password: '', motivo: '' });
  const passed = passedRules(f.password);
  const [esp, setEsp] = useState<string[]>(user?.especialidades.map((e) => e.codigo) ?? []);
  const [newRoles, setNewRoles] = useState<RoleCode[]>(['R01']);
  const [tried, setTried] = useState(false);
  const submit = useSubmit();
  // Al editar, los roles se cambian aparte; aquí manda el rol que ya tiene.
  const isTechnician = user ? user.roles.some((r) => r.codigo === TECNICO) : newRoles.includes(TECNICO);
  const missingSpecialty = isTechnician && esp.length === 0;

  const toggleRole = (code: RoleCode) => {
    const next = newRoles.includes(code) ? newRoles.filter((x) => x !== code) : [...newRoles, code];
    setNewRoles(next);
    // Sin el rol técnico no quedan especialidades residuales.
    if (!next.includes(TECNICO)) setEsp([]);
  };

  const save = async () => {
    setTried(true);
    if (!f.nombre.trim() || !f.email.trim()) return submit.setError('Nombre y correo son obligatorios.');
    if (!user && !f.password) return submit.setError('Escribe la contraseña del nuevo usuario.');
    if (!user && !meetsPolicy(f.password)) return submit.setError(POLICY_MESSAGE);
    if (!user && newRoles.length === 0) return submit.setError('Asigna al menos un rol.');
    if (missingSpecialty) return submit.setError(SPECIALTY_REQUIRED);
    const especialidades = isTechnician ? esp : [];
    const ok = await submit.run(() =>
      user
        ? adminService.updateUser(user.id, { nombre: f.nombre.trim(), email: f.email.trim(), telefono: f.telefono.trim() || null, especialidades, motivo: f.motivo.trim() || undefined })
        : adminService.createUser({ nombre: f.nombre.trim(), email: f.email.trim(), telefono: f.telefono.trim() || undefined, password: f.password, roles: newRoles, especialidades, motivo: f.motivo.trim() || undefined }),
    );
    if (ok) {
      onClose();
      onDone(user ? 'Usuario actualizado.' : 'Usuario creado. Ya puede iniciar sesión con la contraseña asignada.');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={submit.busy}
      size="lg"
      icon={user ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
      title={user ? `Editar a ${user.nombre}` : 'Nuevo usuario'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submit.busy}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={submit.busy}>
            {submit.busy ? 'Guardando…' : user ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-label">
            Nombre completo
            <input className="field mt-1.5 font-normal" maxLength={255} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </label>
          <label className="field-label">
            Correo institucional
            <input type="email" className="field mt-1.5 font-normal" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </label>
          <label className="field-label">
            Teléfono <span className="font-normal text-slate-400">(opcional)</span>
            <input className="field mt-1.5 font-normal" maxLength={30} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
          </label>
          {!user && (
            <label className="field-label">
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Contraseña
              </span>
              <input type="password" autoComplete="new-password" className="field mt-1.5 font-normal" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </label>
          )}
        </div>
        {!user && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Requisitos de la contraseña">
            {PASSWORD_RULES.map((r) => (
              <li key={r.id} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${passed.has(r.id) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {r.label}
              </li>
            ))}
          </ul>
        )}
        {!user && (
          <div>
            <p className="field-label">Roles</p>
            <div className="flex flex-wrap gap-2">
              {roles.data?.map((r) => (
                <button key={r.codigo} type="button" aria-pressed={newRoles.includes(r.codigo)} onClick={() => toggleRole(r.codigo)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${newRoles.includes(r.codigo) ? 'bg-praxis-blue text-white shadow-sm shadow-sky-900/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {newRoles.includes(r.codigo) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {r.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
        <SpecialtyPicker show={isTechnician} selected={esp} onChange={setEsp} invalid={tried && missingSpecialty} />
        <label className="field-label block">
          Motivo del cambio <span className="font-normal text-slate-400">(queda en auditoría)</span>
          <input className="field mt-1.5 font-normal" maxLength={500} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} />
        </label>
        <FormError message={submit.error} />
      </div>
    </Modal>
  );
}

/** Restablecimiento administrativo: el usuario recibe un enlace; el administrador nunca ve contraseñas (HU-1.5). */
function ResetPasswordDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: (m: string) => void }) {
  const submit = useSubmit();
  const send = async () => {
    if (await submit.run(() => adminService.resetPassword(user.id))) {
      onClose();
      onDone('Se ha enviado el enlace de restablecimiento al correo del usuario.');
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      busy={submit.busy}
      icon={<KeyRound className="h-5 w-5" />}
      title="Restablecer contraseña"
      description="Enviaremos al correo institucional del usuario un enlace de un solo uso para que defina una nueva contraseña."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submit.busy}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={send} disabled={submit.busy}>
            {submit.busy ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid gap-x-4 gap-y-2 rounded-2xl border border-praxis-line p-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-xs font-semibold text-slate-500">Nombre</dt>
          <dd className="font-semibold text-slate-900">{user.nombre}</dd>
          <dt className="text-xs font-semibold text-slate-500">Correo</dt>
          <dd className="break-all text-slate-700">{user.email}</dd>
          <dt className="text-xs font-semibold text-slate-500">Rol</dt>
          <dd className="flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <ToneBadge key={r.codigo} tone={ROLE_TONES[r.codigo] ?? 'gris'} dot={false}>
                {r.nombre}
              </ToneBadge>
            ))}
          </dd>
        </dl>
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Por seguridad se cerrarán de inmediato todas las sesiones abiertas de este usuario. No verás ninguna contraseña en pantalla.
        </p>
        <FormError message={submit.error} />
      </div>
    </Modal>
  );
}

function RolesDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: (m: string) => void }) {
  const roles = useApiQuery('admin:roles', adminService.roles, { blocking: false });
  const initialEsp = user.especialidades.map((e) => e.codigo);
  const [selected, setSelected] = useState<RoleCode[]>(user.roles.map((r) => r.codigo));
  const [esp, setEsp] = useState<string[]>(initialEsp);
  const [motivo, setMotivo] = useState('');
  const [tried, setTried] = useState(false);
  const submit = useSubmit();
  const isTechnician = selected.includes(TECNICO);
  const missingSpecialty = isTechnician && esp.length === 0;

  const toggle = (code: RoleCode) => {
    const next = selected.includes(code) ? selected.filter((x) => x !== code) : [...selected, code];
    setSelected(next);
    if (!next.includes(TECNICO)) setEsp([]);
  };

  const save = async () => {
    setTried(true);
    if (selected.length === 0) return submit.setError('El usuario debe tener al menos un rol.');
    if (missingSpecialty) return submit.setError(SPECIALTY_REQUIRED);
    const nextEsp = isTechnician ? esp : [];
    const espChanged = nextEsp.length !== initialEsp.length || nextEsp.some((c) => !initialEsp.includes(c));
    const reason = motivo.trim() || undefined;
    const ok = await submit.run(async () => {
      // Al quitar el rol técnico se limpian primero sus especialidades; al darlo, se asigna el rol primero.
      if (espChanged && !isTechnician) await adminService.updateUser(user.id, { especialidades: [], motivo: reason });
      await adminService.setRoles(user.id, selected, reason);
      if (espChanged && isTechnician) await adminService.updateUser(user.id, { especialidades: nextEsp, motivo: reason });
    });
    if (ok) {
      onClose();
      onDone('Roles actualizados.');
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      busy={submit.busy}
      size="lg"
      icon={<ShieldCheck className="h-5 w-5" />}
      title={`Roles de ${user.nombre}`}
      description="Un usuario puede tener varios roles y elegir con cuál actúa desde su perfil."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submit.busy}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={submit.busy}>
            {submit.busy ? 'Guardando…' : 'Guardar roles'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {roles.data?.map((r) => {
          const on = selected.includes(r.codigo);
          return (
            <label key={r.codigo} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${on ? 'border-praxis-blue bg-sky-50' : 'border-praxis-line hover:border-slate-300'}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-sky-600" checked={on} onChange={() => toggle(r.codigo)} />
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{r.nombre}</span>
                  <span className="font-mono text-[11px] text-slate-400">{r.codigo}</span>
                </span>
                <span className="mt-0.5 block text-sm text-slate-500">{r.descripcion}</span>
              </span>
            </label>
          );
        })}
        <SpecialtyPicker show={isTechnician} selected={esp} onChange={setEsp} invalid={tried && missingSpecialty} />
        {!isTechnician && initialEsp.length > 0 && (
          <p className="text-xs text-amber-700">Al quitar el rol técnico se retirarán sus especialidades ({user.especialidades.map((e) => e.nombre).join(', ')}).</p>
        )}
        <label className="field-label block">
          Motivo <span className="font-normal text-slate-400">(opcional)</span>
          <input className="field mt-1.5 font-normal" maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        <FormError message={submit.error} />
      </div>
    </Modal>
  );
}
