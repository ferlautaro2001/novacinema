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
  let datos: { message?: string; code?: string } = {};

  if (error !== null && error !== undefined) {
    datos = error as { message?: string; code?: string };
  }

  let message = '';

  if (datos.message !== undefined) {
    message = datos.message;
  }

  let code = '';

  if (datos.code !== undefined) {
    code = datos.code;
  }

  let mensaje = 'No se pudo guardar el cambio. Revisá tu conexión y probá de nuevo.';

  if (message.includes(ERROR_HISTORIAL)) {
    mensaje = ERROR_HISTORIAL;
  } else if (message.includes(ERROR_DURACION)) {
    mensaje = ERROR_DURACION;
  } else if (message.includes(ERROR_DESTACADAS)) {
    mensaje = ERROR_DESTACADAS;
  } else if (message.includes('modificada')) {
    mensaje = 'La película fue modificada en otra sesión. Volvé al listado y abrila de nuevo.';
  } else if (code === '23503') {
    // 23503: la película tiene funciones o ventas que la referencian.
    mensaje = ERROR_HISTORIAL;
  }

  return mensaje;
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
    if (error !== null) {
      throw error;
    }

    const peliculas = data as PeliculaConCatalogo[];

    return peliculas;
  }

  async buscar(id: string): Promise<PeliculaConCatalogo> {
    const { data, error } = await this.supS.Sup.from('peliculas')
      .select(SELECCION)
      .eq('id', id)
      .single();
    if (error !== null) {
      throw error;
    }

    const pelicula = data as PeliculaConCatalogo;

    return pelicula;
  }

  // Para el enlace público cartelera/:id: null si no existe, sin error de red en consola.
  async buscarSiExiste(id: string): Promise<PeliculaConCatalogo | null> {
    const { data, error } = await this.supS.Sup.from('peliculas')
      .select(SELECCION)
      .eq('id', id)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    const pelicula = data as PeliculaConCatalogo | null;

    return pelicula;
  }

  async tieneFuncionesFuturas(id: string): Promise<boolean> {
    const ahora = new Date().toISOString();
    const { count, error } = await this.supS.Sup.from('funciones')
      .select('id', { count: 'exact', head: true })
      .eq('pelicula_id', id)
      .eq('estado', 'programada')
      .gt('comienza_en', ahora);
    if (error !== null) {
      throw error;
    }

    let tieneFunciones = false;

    if (count !== null && count > 0) {
      tieneFunciones = true;
    }

    return tieneFunciones;
  }

  async guardar(
    datos: DatosPelicula,
    generos: number[],
    original: PeliculaConCatalogo | null,
  ): Promise<string> {
    let id: string | null = null;
    let version: string | null = null;

    if (original !== null) {
      id = original.id;
      version = original.actualizado_en;
    }

    // Uso RPC para guardar película y géneros en una sola transacción: si falla
    // una de las tablas se revierte todo y no quedan altas a medias.
    const { data, error } = await this.supS.Sup.rpc('guardar_pelicula', {
      p_id: id,
      p_datos: { ...datos },
      p_generos: generos,
      p_version: version,
    });
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async destacar(pelicula: PeliculaConCatalogo): Promise<void> {
    let destacada = true;

    if (pelicula.destacada) {
      destacada = false;
    }

    const { error } = await this.supS.Sup.from('peliculas')
      .update({ destacada: destacada })
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error !== null) {
      throw error;
    }
  }

  async finalizar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { error } = await this.supS.Sup.from('peliculas')
      .update({ activo: false, estado: 'archivada', destacada: false })
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error !== null) {
      throw error;
    }
  }

  async eliminar(pelicula: PeliculaConCatalogo): Promise<void> {
    const { count, error: consultaError } = await this.supS.Sup.from('funciones')
      .select('id', { count: 'exact', head: true })
      .eq('pelicula_id', pelicula.id);
    if (consultaError !== null) {
      throw consultaError;
    }

    // Toda entrada referencia una función, así que con funciones ya no se puede borrar.
    if (count !== null && count !== 0) {
      throw new Error(ERROR_HISTORIAL);
    }

    const { error } = await this.supS.Sup.from('peliculas')
      .delete()
      .eq('id', pelicula.id)
      .eq('actualizado_en', pelicula.actualizado_en)
      .select('id')
      .single();
    if (error !== null) {
      throw error;
    }
  }
}
