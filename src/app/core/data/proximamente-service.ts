import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { PeliculaConCatalogo } from '../models/pelicula';

// Películas por estrenar cuya venta todavía no abrió (US-06.07).
@Service()
export class ProximamenteService {
  private supS = inject(Supabase);

  // Activas, con estreno en las próximas 4 semanas y venta cerrada, por fecha de estreno.
  async listarProximamente(): Promise<PeliculaConCatalogo[]> {
    const peliculas: PeliculaConCatalogo[] = [];

    return peliculas;
  }
}
