import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Actividad = Tables<'actividad'>;
export type ActividadPorCrear = TablesInsert<'actividad'>;

export type AccionAuditoria = Tables<'acciones_auditoria'>;

export type Configuracion = Tables<'configuracion'>;
export type ConfiguracionPorModificar = TablesUpdate<'configuracion'>;

export type FacturacionDiaria = Tables<'v_facturacion_diaria'>;
