import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { PeliculaConCatalogo } from '../models/pelicula';
import { ventaAbierta } from '../reglas/preventa';
import { aISO, inicioDelDia, sumarDias } from '../../shared/utilidades/fechas';

const SELECCION =
  '*, clasificacion:clasificaciones(codigo, edad_minima), pelicula_generos(genero:generos(id, nombre)), preventa:preventas(habilitada, dias_antes)';
const DIAS_DE_VENTANA = 28;

// Películas por estrenar cuya venta todavía no abrió (US-06.07).
@Service()
export class ProximamenteService {
  private supS = inject(Supabase);

  // Activas, con estreno en las próximas 4 semanas y venta cerrada, por fecha de estreno.
  async listarProximamente(): Promise<PeliculaConCatalogo[]> {
    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    const limite = sumarDias(hoy, DIAS_DE_VENTANA);

    // SELECT *, clasificacion:clasificaciones(codigo, edad_minima),
    //        pelicula_generos:generos(id, nombre), preventa:preventas(habilitada, dias_antes)
    //   FROM peliculas
    //   WHERE activo AND estado <> 'archivada'
    //     AND fecha_estreno BETWEEN hoy AND hoy + 28 días
    //   ORDER BY fecha_estreno, titulo
    const { data, error } = await this.supS.Sup.from('peliculas')
      .select(SELECCION)
      .eq('activo', true)
      .neq('estado', 'archivada')
      .gte('fecha_estreno', aISO(hoy))
      .lte('fecha_estreno', aISO(limite))
      .order('fecha_estreno', { ascending: true })
      .order('titulo', { ascending: true });
    if (error !== null) {
      throw error;
    }

    const peliculas: PeliculaConCatalogo[] = [];

    // Si ya abrió la venta (por preventa o porque se estrena hoy) está en cartelera.
    for (const fila of data) {
      const abierta = ventaAbierta(fila.fecha_estreno, fila.preventa, ahora);

      if (abierta === false) {
        peliculas.push(fila as PeliculaConCatalogo);
      }
    }

    return peliculas;
  }
}
