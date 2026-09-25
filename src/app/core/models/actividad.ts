import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { AccionAuditoriaCodigo } from './enumerados';

export type Actividad = Tables<'actividad'>;
export type ActividadPorCrear = TablesInsert<'actividad'>;

export type AccionAuditoria = Tables<'acciones_auditoria'>;

// Un registro del log listo para mostrar.
export interface RegistroActividad {
  id: string;
  fecha: Date;
  autor: string;
  codigo: AccionAuditoriaCodigo;
  accion: string;
  entidad: string;
  detalle: string;
}

export type Configuracion = Tables<'configuracion'>;
export type ConfiguracionPorModificar = TablesUpdate<'configuracion'>;

export type FacturacionDiaria = Tables<'v_facturacion_diaria'>;
