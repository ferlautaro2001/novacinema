import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Resena = Tables<'resenas'>;
export type ResenaPorCrear = TablesInsert<'resenas'>;
export type ResenaPorModificar = TablesUpdate<'resenas'>;

/** Esta vista ya me devuelve el promedio en escala 0 a 10, que es como lo pide
    la consigna, aunque yo guarde estrellas del 1 al 5. */
export type PeliculaRating = Tables<'v_pelicula_rating'>;
