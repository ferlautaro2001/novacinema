import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import { AlertasService } from './alertas-service';
import type { Preventa, PreventaPorCrear } from '../models/precio';

@Service()
export class PreventasService {
  private supS = inject(Supabase);
  private alertas = inject(AlertasService);

  // Si la película nunca tuvo preventa, no hay fila y devuelvo null.
  async buscar(peliculaId: string): Promise<Preventa | null> {
    const { data, error } = await this.supS.Sup.from('preventas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    return data;
  }

  // Hay una sola preventa por película: si ya existe la actualizo, si no la creo.
  async guardar(preventa: PreventaPorCrear): Promise<void> {
    const { error } = await this.supS.Sup.from('preventas').upsert(preventa, {
      onConflict: 'pelicula_id',
    });
    if (error !== null) {
      throw error;
    }

    // Si con esta preventa abrió la venta, aviso a los que tienen alerta (US-06.08).
    // La preventa ya quedó guardada: un aviso que falla no la tiene que deshacer.
    try {
      await this.alertas.notificarAperturaDeVenta(preventa.pelicula_id);
    } catch {
      // Los que no reciban el aviso ahora lo van a recibir al ingresar.
    }
  }
}
