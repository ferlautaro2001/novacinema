import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { PeliculaConCatalogo } from '../models/pelicula';

// Ranking de películas por entradas vendidas (US-06.01).
@Service()
export class RankingService {
  private supS = inject(Supabase);

  // Hasta 3 películas en cartelera, de más a menos entradas vendidas no canceladas.
  async masVendidas(): Promise<PeliculaConCatalogo[]> {
    const peliculas: PeliculaConCatalogo[] = [];

    return peliculas;
  }
}
