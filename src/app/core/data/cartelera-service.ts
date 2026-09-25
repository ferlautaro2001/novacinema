import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { PeliculaEnCartelera } from '../models/pelicula';

// Películas que el público puede comprar ahora (US-06.03).
@Service()
export class CarteleraService {
  private supS = inject(Supabase);

  // Películas activas con al menos una función futura cuya venta ya abrió.
  async listarEnCartelera(): Promise<PeliculaEnCartelera[]> {
    const peliculas: PeliculaEnCartelera[] = [];

    return peliculas;
  }
}
