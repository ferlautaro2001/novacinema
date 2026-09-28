import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { ClasificacionCodigo, EstadoPelicula } from './enumerados';

export const EDADES_MINIMAS: Record<ClasificacionCodigo, number> = {
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

// El catálogo importado de TMDB trae algunos géneros con otro nombre.
export function nombreGenero(nombre: string): string {
  let bandera = nombre;

  switch (nombre) {
    case 'Familia':
      bandera = 'Familiar';
      break;

    case 'Música':
      bandera = 'Musical';
      break;

    case 'Suspense':
      bandera = 'Suspenso';
      break;
  }

  return bandera;
}

export interface PeliculaConCatalogo extends Pelicula {
  clasificacion: { codigo: ClasificacionCodigo; edad_minima: number };
  pelicula_generos: { genero: { id: number; nombre: string } }[];
}

// Una película lista para mostrar en la cartelera pública (US-06.03).
// La cartelera no trae la tabla de unión de géneros: la vista v_cartelera ya los
// devuelve como nombres, y el listado no necesita otra cosa.
export interface PeliculaEnCartelera extends Pelicula {
  clasificacion: { codigo: ClasificacionCodigo; edad_minima: number };
  generos: string[];
  // De 0 a 10 con un decimal; null si todavía no tiene reseñas.
  puntuacion: number | null;
  enPreventa: boolean;
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

// En la base estado es text con CHECK, por eso lo piso con el tipo literal.
export type Pelicula = Omit<Tables<'peliculas'>, 'estado'> & { estado: EstadoPelicula };
export type PeliculaPorCrear = TablesInsert<'peliculas'>;
export type PeliculaPorModificar = TablesUpdate<'peliculas'>;

export type PeliculaGenero = Tables<'pelicula_generos'>;

export type AlertaEstreno = Tables<'alertas_estreno'>;
export type AlertaEstrenoPorCrear = TablesInsert<'alertas_estreno'>;

export type Notificacion = Tables<'notificaciones'>;
export type NotificacionPorCrear = TablesInsert<'notificaciones'>;

export type RankingPelicula = Tables<'v_ranking_peliculas'>;
