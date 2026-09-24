import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Sala } from '../models/sala';

@Service()
export class SalasService {
  private supS = inject(Supabase);

  async listar(): Promise<Sala[]> {
    const { data, error } = await this.supS.Sup
      .from('salas')
      .select('*')
      .order('numero');
    if (error) throw error;
    return data ?? [];
  }

  async buscar(id: string): Promise<Sala | null> {
    const { data, error } = await this.supS.Sup
      .from('salas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }

  // Comprueba si la sala tiene funciones futuras con entradas vendidas (US-04.01).
  async tieneVentasFuturas(salaId: string): Promise<boolean> {
    const ahora = new Date().toISOString();
    const { data: funciones, error: errF } = await this.supS.Sup
      .from('funciones')
      .select('id')
      .eq('sala_id', salaId)
      .neq('estado', 'cancelada')
      .gte('comienza_en', ahora);

    if (errF) throw errF;
    if (!funciones || funciones.length === 0) return false;

    const funcionIds = funciones.map((f) => f.id);
    const { count, error: errE } = await this.supS.Sup
      .from('entradas')
      .select('*', { count: 'exact', head: true })
      .in('funcion_id', funcionIds)
      .is('anulada_en', null);

    if (errE) throw errE;
    return (count ?? 0) > 0;
  }

  async activarSala(id: string, activa: boolean): Promise<void> {
    if (!activa) {
      const tieneVentas = await this.tieneVentasFuturas(id);
      if (tieneVentas) {
        throw new Error('La sala tiene funciones con entradas vendidas');
      }
    }
    const { error } = await this.supS.Sup
      .from('salas')
      .update({ activa, actualizado_en: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
