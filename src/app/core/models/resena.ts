import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Resena = Tables<'resenas'>;
export type ResenaPorCrear = TablesInsert<'resenas'>;
export type ResenaPorModificar = TablesUpdate<'resenas'>;

// La vista devuelve el promedio de 0 a 10, como pide la consigna, aunque guardo
// estrellas del 1 al 5.
export type PeliculaRating = Tables<'v_pelicula_rating'>;
