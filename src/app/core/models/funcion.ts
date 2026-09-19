import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { EstadoFuncion } from './enumerados';

export type Funcion = Omit<Tables<'funciones'>, 'estado'> & { estado: EstadoFuncion };
export type FuncionPorCrear = TablesInsert<'funciones'>;
export type FuncionPorModificar = TablesUpdate<'funciones'>;

/** Ojo con esta: butacas_libres y total_butacas vienen como nullable porque
    Postgres no le garantiza a Supabase que una vista no devuelva nulos. Hay que
    angostarlo a mano donde se use. */
export type FuncionDisponibilidad = Tables<'v_funcion_disponibilidad'>;
