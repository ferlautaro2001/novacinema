import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { EstadoFuncion } from './enumerados';

export type Funcion = Omit<Tables<'funciones'>, 'estado'> & { estado: EstadoFuncion };
export type FuncionPorCrear = TablesInsert<'funciones'>;
export type FuncionPorModificar = TablesUpdate<'funciones'>;

// Ojo: en las vistas todas las columnas vienen como nullable, hay que chequearlas
// donde se usen.
export type FuncionDisponibilidad = Tables<'v_funcion_disponibilidad'>;
