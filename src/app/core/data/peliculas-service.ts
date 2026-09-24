import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { DatosPelicula, PeliculaConCatalogo } from '../models/pelicula';

const SELECCION =
  '*, clasificacion:clasificaciones(codigo, edad_minima), pelicula_generos(genero:generos(id, nombre))';
export const ERROR_HISTORIAL =
  'No se puede eliminar una película con funciones o ventas. Podés marcarla como finalizada';
export const ERROR_DURACION = 'No se puede cambiar la duración con funciones programadas';
export const ERROR_DESTACADAS = 'Podés destacar hasta 6 películas';

export function errorPelicula(error: unknown): string {
  const mensaje = (error as { message?: string })?.message ?? '';
  for (const conocido of [ERROR_HISTORIAL, ERROR_DURACION, ERROR_DESTACADAS]) {
    if (mensaje.includes(conocido)) return conocido;
  }
  if (mensaje.includes('modificada'))
    return 'La película fue modificada en otra sesión. Volvé al listado y abrila de nuevo.';
  if ((error as { code?: string })?.code === '23503') return ERROR_HISTORIAL;
  return 'No se pudo guardar el cambio. Revisá tu conexión y probá de nuevo.';
}

@Service()
export class PeliculasService {
  private readonly sup = inject(Supabase).Sup;

  async listar(): Promise<PeliculaConCatalogo[]> {
    let consulta = this.sup.from('peliculas').select(SELECCION).order('titulo');
    const { data, error } = await consulta;
    if (error) throw error;
    return data as PeliculaConCatalogo[];
  }


}
