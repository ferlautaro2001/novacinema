import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Sala } from '../models/sala';

@Service()
export class SalasService {
  private supS = inject(Supabase);

  async listar(): Promise<Sala[]> {
    const { data, error } = await this.supS.Sup.from('salas').select('*').order('numero');
    if (error) throw error;
    return data;
  }

  async buscar(id: string): Promise<Sala | null> {
    const { data, error } = await this.supS.Sup.from('salas').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  // Si la sala tiene funciones futuras con entradas vendidas.
  async tieneVentasFuturas(salaId: string): Promise<boolean> {
    const { data: funciones, error } = await this.supS.Sup.from('funciones')
      .select('id')
      .eq('sala_id', salaId)
      .neq('estado', 'cancelada')
      .gte('comienza_en', new Date().toISOString());
    if (error) throw error;
    if (funciones.length === 0) return false;

    const ids = funciones.map((f) => f.id);
    const { count, error: errorEntradas } = await this.supS.Sup.from('entradas')
      .select('*', { count: 'exact', head: true })
      .in('funcion_id', ids)
      .is('anulada_en', null);
    if (errorEntradas) throw errorEntradas;
    return (count ?? 0) > 0;
  }

  async activarSala(id: string, activa: boolean): Promise<void> {
    if (!activa && (await this.tieneVentasFuturas(id))) {
      throw new Error('La sala tiene funciones con entradas vendidas');
    }
    const { error } = await this.supS.Sup.from('salas')
      .update({ activa, actualizado_en: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }
}
