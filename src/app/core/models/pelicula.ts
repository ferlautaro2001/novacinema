import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { EstadoPelicula } from './enumerados';
import type { ClasificacionCodigo } from './enumerados';

export type Clasificacion = ClasificacionCodigo;
export const EDADES_MINIMAS: Record<Clasificacion, number> = {
  ATP: 0,
  '+13': 13,
  '+16': 16,
  '+18': 18,
};
export const GENEROS_PELICULA = [
  'Acción',
  'Animación',
  'Aventura',
  'Ciencia ficción',
  'Comedia',
  'Documental',
  'Drama',
  'Familiar',
  'Fantasía',
  'Musical',
  'Romance',
  'Suspenso',
  'Terror',
];
// El catálogo importado de TMDB conserva sus ids; adaptamos las etiquetas al TP.
export function nombreGenero(nombre: string): string {
  const equivalencias: Record<string, string> = {
    Familia: 'Familiar',
    Música: 'Musical',
    Suspense: 'Suspenso',
  };
  return equivalencias[nombre] ?? nombre;
}
export interface PeliculaConCatalogo extends Pelicula {
  clasificacion: { codigo: Clasificacion; edad_minima: number };
  pelicula_generos: { genero: { id: number; nombre: string } }[];
}
export interface DatosPelicula {
  titulo: string;
  sinopsis: string;
  duracion_min: number;
  clasificacion_id: number;
  imagen_path: string;
  fecha_estreno: string;
  estado: EstadoPelicula;
}

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
