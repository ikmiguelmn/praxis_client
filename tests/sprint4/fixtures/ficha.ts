/**
 * Ficha operativa simulada (GET /incidencias/{id}) para las pruebas de interfaz del Sprint 4.
 * Solo trae los campos que la pantalla necesita; los datos son ficticios.
 */

const ahora = new Date().toISOString();

export const TECNICO_QA = { id: 9000, name: 'Usuario QA R04', email: 'qa.r04@example.test' };
export const OTRO_TECNICO = { id: 8001, name: 'Otro Tecnico', email: 'otro@example.test' };

export function diagnostico(extra: Record<string, unknown> = {}) {
  return {
    id: 1,
    fecha_inicio_inspeccion: ahora,
    fecha_fin_diagnostico: ahora,
    incidencia_confirmada: true,
    hallazgos: 'Cilindro desgastado y pasador roto.',
    descripcion_problema: 'Desgaste del mecanismo por uso continuo.',
    alcance: null,
    intervencion_propuesta: 'Reemplazo del cilindro completo.',
    justificacion_no_confirmada: null,
    requiere_recursos: false,
    requiere_autorizacion: false,
    estado: 'REGISTRADO',
    observaciones_devolucion: null,
    fecha_revision: null,
    created_at: ahora,
    ...extra,
  };
}

export function solicitudPendiente(extra: Record<string, unknown> = {}) {
  return {
    id: 5,
    estado_solicitud: 'PENDIENTE_RECURSOS',
    decision_requerida: 'Compra de cerradura multipunto',
    requiere_autorizacion: false,
    es_emergencia: false,
    resultado_dictamen: null,
    justificacion_dictamen: null,
    costo_total_estimado: 350000,
    detalles: [{ id: 50, recurso_nombre: 'Cerradura multipunto', cantidad: 1, unidad: 'und', costo_estimado: 350000, disponible: false }],
    seguimientos: [],
    ...extra,
  };
}

export function fichaOperativa(estado: { codigo: string; nombre: string }, extra: Record<string, unknown> = {}) {
  return {
    id: 'inc-ficha',
    codigo_ticket: 'TKT-2026-009001',
    resumen: 'Cerradura del aula 101 no cierra',
    descripcion: 'La cerradura de la puerta principal no asegura.',
    canal_radicacion: 'WEB',
    estado: { ...estado, color: '#64748b', significado: '' },
    categoria: { id: 1, codigo: 'CERRAJERIA', nombre: 'Cerrajería' },
    subcategoria: { id: 2, nombre: 'Chapas' },
    prioridad: { codigo: 'ALTA', nombre: 'Alta', color: '#f59e0b' },
    ubicacion: { texto: 'Sede Central > Bloque A > Piso 1 > Aula 101', espacio: { nombre: 'Aula 101' }, edificio: { nombre: 'Bloque A' }, piso: { nombre: 'Piso 1' } },
    es_riesgo_inmediato: false,
    posible_duplicado: false,
    fecha_registro: ahora,
    fecha_actualizacion: ahora,
    fecha_cierre: null,
    reportante: { id: 77, name: 'Reportante QA', email: 'reportante@example.test' },
    tecnico_asignado: TECNICO_QA,
    impacto: null,
    urgencia: null,
    protocolo_emergencia_activo: false,
    descripcion_riesgo: null,
    numero_reaperturas: 0,
    numero_reprocesos: 0,
    resultado_final_cierre: null,
    incidencia_principal: null,
    duplicados_vinculados: [],
    sla: null,
    aclaraciones: [],
    evaluaciones_riesgo: [],
    asignaciones: [],
    diagnosticos: [],
    solicitudes_recursos: [],
    planes_intervencion: [],
    actividades: [],
    suspensiones: [],
    verificaciones: [],
    evidencias: [],
    transiciones_disponibles: [],
    ...extra,
  };
}

export const ESTADOS = {
  E06: { codigo: 'E06', nombre: 'Pendiente de inspección' },
  E07: { codigo: 'E07', nombre: 'En diagnóstico' },
  E09: { codigo: 'E09', nombre: 'Pendiente de recursos' },
  E10: { codigo: 'E10', nombre: 'Programada' },
  E11: { codigo: 'E11', nombre: 'En atención' },
  E18: { codigo: 'E18', nombre: 'Suspendida' },
};
