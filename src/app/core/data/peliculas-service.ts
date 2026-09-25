import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { DatosPelicula, PeliculaConCatalogo } from '../models/pelicula';

const SELECCION =
  '*, clasificacion:clasificaciones(codigo, edad_minima), pelicula_generos(genero:generos(id, nombre))';
export const ERROR_HISTORIAL =
  'No se puede eliminar una película con funciones o ventas. Podés marcarla como finalizada';
export const ERROR_DURACION = 'No se puede cambiar la duración con funciones programadas';
export const ERROR_DESTACADAS = 'Podés destacar hasta 6 películas';

// Traduce el error de la base a un mensaje para mostrar.
export function errorPelicula(error: unknown): string {
  const { message = '', code = '' } = (error ?? {}) as { message?: string; code?: string };
  if (message.includes(ERROR_HISTORIAL)) return ERROR_HISTORIAL;
  if (message.includes(ERROR_DURACION)) return ERROR_DURACION;
  if (message.includes(ERROR_DESTACADAS)) return ERROR_DESTACADAS;
  if (message.includes('modificada')) {
    return 'La película fue modificada en otra sesión. Volvé al listado y abrila de nuevo.';
  }
  // 23503: la película tiene funciones o ventas que la referencian.
  if (code === '23503') return ERROR_HISTORIAL;
  return 'No se pudo guardar el cambio. Revisá tu conexión y probá de nuevo.';
}

@Service()
export class PeliculasService {
  private supS = inject(Supabase);

  async listar(soloDestacadas = false): Promise<PeliculaConCatalogo[]> {
    let consulta = this.supS.Sup.from('peliculas').select(SELECCION).order('titulo');
    if (soloDestacadas) {
      consulta = consulta.eq('destacada', true).eq('activo', true).neq('estado', 'archivada');
    }
    const { data, error } = await consulta;
    if (error) throw error;
    return data as PeliculaConCatalogo[];
  }

  async buscar(id: string): Promise<PeliculaConCatalogo> {
    const { data, error } = await this.supS.Sup.from('peliculas')
      .select(SELECCION)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as PeliculaConCatalogo;
  }

  async tieneFuncionesFuturas(id: string): Promise<boolean> {
    const { count, error } = await this.supS.Sup.from('funciones')
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
    // Uso RPC para guardar película y géneros en una sola transacción: si falla
    // una de las tablas se revierte todo y no quedan altas a medias.
    const { data, error } = await this.supS.Sup.rpc('guardar_pelicula', {
      p_id: original?.id ?? null,
      p_datos: { ...datos },
      p_generos: generos,
      p_version: original?.actualizado_en ?? null,
    });
    if (error) throw error;
    return data;
  }

  async destacar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { error } = await this.supS.Sup.from('peliculas')
      .update({ destacada: !pelicula.destacada })
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error) throw error;
  }

  async finalizar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { error } = await this.supS.Sup.from('peliculas')
      .update({ activo: false, estado: 'archivada', destacada: false })
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error) throw error;
  }

  async eliminar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { count, error: consultaError } = await this.supS.Sup.from('funciones')
      .select('id', { count: 'exact', head: true })
      .eq('pelicula_id', pelicula.id);
    if (consultaError) throw consultaError;
    // Toda entrada referencia una función, así que con funciones ya no se puede borrar.
    if (count) throw new Error(ERROR_HISTORIAL);
    const { error } = await this.supS.Sup.from('peliculas')
      .delete()
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error) throw error;
  }
}
