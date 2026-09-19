import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Sala = Tables<'salas'>;
export type SalaPorCrear = TablesInsert<'salas'>;
export type SalaPorModificar = TablesUpdate<'salas'>;

export type Fila = Tables<'filas'>;
export type Butaca = Tables<'butacas'>;

/** Me devuelve qué butacas ya están vendidas en cada función. La uso para
    pintar el mapa de la sala. */
export type ButacaOcupada = Tables<'v_butacas_ocupadas'>;
