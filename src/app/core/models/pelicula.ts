import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { EstadoPelicula } from './enumerados';

// `estado` se angosta al alias literal: en la base es text con CHECK, y los
// tipos generados lo ven como string.
export type Pelicula = Omit<Tables<'peliculas'>, 'estado'> & { estado: EstadoPelicula };
export type PeliculaPorCrear = TablesInsert<'peliculas'>;
export type PeliculaPorModificar = TablesUpdate<'peliculas'>;

export type PeliculaGenero = Tables<'pelicula_generos'>;

export type AlertaEstreno = Tables<'alertas_estreno'>;
export type AlertaEstrenoPorCrear = TablesInsert<'alertas_estreno'>;

export type Notificacion = Tables<'notificaciones'>;
export type NotificacionPorCrear = TablesInsert<'notificaciones'>;

export type RankingPelicula = Tables<'v_ranking_peliculas'>;
