import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Sala = Tables<'salas'>;
export type SalaPorCrear = TablesInsert<'salas'>;
export type SalaPorModificar = TablesUpdate<'salas'>;

export type Fila = Tables<'filas'>;
export type Butaca = Tables<'butacas'>;

// Butacas vendidas por función, para pintar el mapa.
export type ButacaOcupada = Tables<'v_butacas_ocupadas'>;
