"use client";

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Paperclip, UserRound } from 'lucide-react';
import Stamp, { stampFor } from './Stamp';
import type { EventoHistorial } from '@/types/incident';
import { TONE_CLASSES, stateTone } from '@/lib/tones';
import { formatDateTime } from '@/lib/format';

const EVENT_LABELS: Record<string, string> = {
  CREACION: 'Reporte registrado',
  CAMBIO_ESTADO: 'Cambio de estado',
  COMUNICACION: 'Notificación enviada',
  INICIO_REVISION: 'Revisión iniciada',
  VALIDACION_PROCEDENCIA: 'Procedencia validada',
  CLASIFICACION: 'Clasificación',
  CAMBIO_PRIORIDAD: 'Prioridad actualizada',
  REMISION_COORDINACION: 'Remitida a coordinación',
  NO_PROCEDENTE: 'Marcada como no procedente',
  SOLICITUD_ACLARACION: 'Se pidió una aclaración',
  ACLARACION_SOLICITADA: 'Se pidió una aclaración',
  ACLARACION: 'Aclaración',
  ACLARACION_RESPONDIDA: 'Aclaración respondida',
  ACLARACION_RECIBIDA: 'Aclaración recibida',
  DUPLICADO_VINCULADO: 'Unificada con otra solicitud',
  DUPLICADO_DESCARTADO: 'Sugerencia de duplicado descartada',
  PROTOCOLO_EMERGENCIA: 'Protocolo de emergencia',
  PROTOCOLO_EMERGENCIA_ACTIVADO: 'Protocolo de emergencia activado',
  ASIGNACION: 'Técnico asignado',
  REASIGNACION: 'Técnico reasignado',
  INICIO_INSPECCION: 'Inspección iniciada',
  DIAGNOSTICO: 'Diagnóstico',
  DIAGNOSTICO_REGISTRADO: 'Diagnóstico registrado',
  DIAGNOSTICO_DEVUELTO: 'Diagnóstico devuelto',
  DEVOLUCION_DIAGNOSTICO: 'Diagnóstico devuelto',
  DESCARTE_POR_INSPECCION: 'Daño no confirmado en inspección',
  CIERRE_NO_CONFIRMADA: 'Cerrada: no confirmada en inspección',
  SOLICITUD_RECURSOS: 'Recursos solicitados',
  SOLICITUD_AUTORIZACION: 'Autorización solicitada',
  RECHAZO_AUTORIZACION: 'Autorización rechazada',
  RECURSOS_DISPONIBLES: 'Recursos disponibles',
  RECURSOS_EMERGENCIA: 'Recursos de emergencia',
  SEGUIMIENTO_RECURSOS: 'Seguimiento de recursos',
  PROGRAMACION: 'Intervención programada',
  REPROGRAMACION: 'Intervención reprogramada',
  INICIO_ATENCION: 'Atención iniciada',
  INTERVENCION: 'Intervención registrada',
  EJECUCION_REGISTRADA: 'Ejecución registrada',
  SUSPENSION: 'Atención suspendida',
  SUSPENDER: 'Atención suspendida',
  REANUDACION: 'Atención reanudada',
  DICTAMEN_CALIDAD: 'Dictamen de calidad',
  CONFIRMACION_REQUERIDA: 'Confirmación solicitada al reportante',
  CONFIRMACION: 'Solución confirmada',
  REAPERTURA: 'Solicitud reabierta',
  CIERRE: 'Incidencia cerrada',
  CANCELACION: 'Solicitud cancelada',
  CANCELAR: 'Solicitud cancelada',
  CANCELACION_REPORTANTE: 'Cancelada por el reportante',
  CANCELACION_ADMINISTRATIVA: 'Anulada por coordinación',
};

const ROLE_LABELS: Record<string, string> = {
  R01: 'Reportante',
  R02: 'Mesa de ayuda',
  R03: 'Coordinación',
  R04: 'Técnico',
  R05: 'Autorizaciones',
  R06: 'Verificación',
  R07: 'Administración',
  SISTEMA: 'Sistema',
};

function eventTitle(event: EventoHistorial): string {
  if (event.estado_nuevo && (!event.tipo_evento || event.tipo_evento === 'CAMBIO_ESTADO')) return event.estado_nuevo.nombre;
  return EVENT_LABELS[event.tipo_evento] ?? event.tipo_evento.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Línea de tiempo vertical de la trazabilidad, del evento más reciente al más antiguo. */
const FILTERS: { key: string; label: string; test: (e: EventoHistorial) => boolean }[] = [
  { key: 'todo', label: 'Todo', test: () => true },
  { key: 'estado', label: 'Estados', test: (e) => Boolean(e.estado_nuevo) },
  { key: 'evidencias', label: 'Con evidencias', test: (e) => Boolean(e.evidencias?.length) },
  { key: 'avisos', label: 'Notificaciones', test: (e) => e.tipo_evento === 'COMUNICACION' },
];

export default function StatusTimeline({
  events,
  compact = false,
  filterable = false,
  selfName,
}: {
  events: EventoHistorial[];
  compact?: boolean;
  filterable?: boolean;
  /** Nombre de quien ve su propia solicitud: el historial público no trae nombres y sus acciones (rol R01) son suyas. */
  selfName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState('todo');
  const test = FILTERS.find((f) => f.key === filter)!.test;
  const ordered = [...events].filter(test).sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

  const chips = filterable && (
    <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por hito">
      {FILTERS.map((f) => (
        <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${filter === f.key ? 'bg-praxis-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          {f.label} <span className="opacity-60">{events.filter(f.test).length}</span>
        </button>
      ))}
    </div>
  );

  if (ordered.length === 0)
    return (
      <>
        {chips}
        <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
      </>
    );

  return (
    <>
    {chips}
    <ol className="relative">
      {ordered.map((event, index) => {
        const tone = TONE_CLASSES[stateTone(event.estado_nuevo?.codigo)];
        const latest = index === 0;
        const who = event.usuario?.name ?? event.usuario?.nombre ?? (selfName && event.rol === 'R01' ? `${selfName} (tú)` : undefined);
        const role = event.rol ? ROLE_LABELS[event.rol] ?? event.rol : null;
        const stamp = stampFor(event.estado_nuevo?.codigo, event.tipo_evento);
        return (
          <motion.li
            key={event.id}
            className="relative pb-6 pl-8 last:pb-0"
            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index, 8) * 0.04 }}
          >
            {index < ordered.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" aria-hidden="true" />}
            <span className={`absolute left-0 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full ring-4 ring-white ${latest ? tone.dot : 'bg-slate-300'}`} aria-hidden="true">
              {latest && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${tone.dot}`} />}
            </span>
            <div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${latest ? tone.text : 'text-slate-800'}`}>{eventTitle(event)}</p>
                <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(event.fecha_hora)}</p>
                {(who || role) && (
                  <p className="mt-1 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {who && <span className="font-semibold text-slate-700">{who}</span>}
                    {who && role && <span aria-hidden="true">·</span>}
                    {role && <span>{role}</span>}
                  </p>
                )}
              </div>
              {stamp && !compact && <Stamp label={stamp.label} tone={stamp.tone} animate={latest} className="ml-1 mt-2" />}
            </div>
            {event.motivo && !compact && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{event.motivo}</p>}
            {event.evidencias && event.evidencias.length > 0 && !compact && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                {event.evidencias.length} evidencia{event.evidencias.length === 1 ? '' : 's'}
              </p>
            )}
          </motion.li>
        );
      })}
    </ol>
    </>
  );
}
