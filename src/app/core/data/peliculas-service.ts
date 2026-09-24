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

  async buscar(id: string): Promise<PeliculaConCatalogo> {
    const { data, error } = await this.sup
      .from('peliculas')
      .select(SELECCION)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as PeliculaConCatalogo;
  }

  async tieneFuncionesFuturas(id: string): Promise<boolean> {
    const { count, error } = await this.sup
      .from('funciones')
      .select('id', { count: 'exact', head: true })
      .eq('pelicula_id', id)
      .eq('estado', 'programada')
      .gt('comienza_en', new Date().toISOString());
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async guardar(
    datos: DatosPelicula,
    generos: number[],
    original: PeliculaConCatalogo | null,
  ): Promise<string> {
    // Película y géneros forman una sola operación: la función ejecuta INSERT / UPDATE
    // con RLS y revierte todo si falla una de las tablas. Evita altas a medias.
    const { data, error } = await this.sup.rpc('guardar_pelicula', {
      p_id: original?.id ?? null,
      p_datos: { ...datos },
      p_generos: generos,
      p_version: original?.actualizado_en ?? null,
    });
    if (error) throw error;
    return data;
  }

  async finalizar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { error } = await this.sup
      .from('peliculas')
      .update({ activo: false, estado: 'archivada', destacada: false })
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error) throw error;
  }

  async eliminar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { count, error: consultaError } = await this.sup
      .from('funciones')
      .select('id', { count: 'exact', head: true })
      .eq('pelicula_id', pelicula.id);
    if (consultaError) throw consultaError;
    // Toda entrada referencia una función: si hay funciones, ya no se puede eliminar.
    if (count) throw new Error(ERROR_HISTORIAL);
    const { error } = await this.sup
      .from('peliculas')
      .delete()
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error) throw error;
  }
}
