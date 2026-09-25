import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Preventa, PreventaPorCrear } from '../models/precio';

@Service()
export class PreventasService {
  private supS = inject(Supabase);

  // Si la película nunca tuvo preventa, no hay fila y devuelvo null.
  async buscar(peliculaId: string): Promise<Preventa | null> {
    const { data, error } = await this.supS.Sup.from('preventas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Hay una sola preventa por película: si ya existe la actualizo, si no la creo.
  async guardar(preventa: PreventaPorCrear): Promise<void> {
    const { error } = await this.supS.Sup.from('preventas').upsert(preventa, {
      onConflict: 'pelicula_id',
    });
    if (error) throw error;
  }
}
