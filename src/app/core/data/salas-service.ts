import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Sala } from '../models/sala';

@Service()
export class SalasService {
  private supS = inject(Supabase);

  async listar(): Promise<Sala[]> {
    const { data, error } = await this.supS.Sup.from('salas').select('*').order('numero');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async buscar(id: string): Promise<Sala | null> {
    const { data, error } = await this.supS.Sup.from('salas').select('*').eq('id', id).single();

    let sala: Sala | null = null;

    if (error === null) {
      sala = data;
    }

    return sala;
  }

  // Si la sala tiene funciones futuras con entradas vendidas.
  async tieneVentasFuturas(salaId: string): Promise<boolean> {
    const ahora = new Date().toISOString();
    const { data: funciones, error } = await this.supS.Sup.from('funciones')
      .select('id')
      .eq('sala_id', salaId)
      .neq('estado', 'cancelada')
      .gte('comienza_en', ahora);
    if (error !== null) {
      throw error;
    }

    let tieneVentas = false;

    if (funciones.length !== 0) {
      const ids: string[] = [];

      for (const funcion of funciones) {
        ids.push(funcion.id);
      }

      const { count, error: errorEntradas } = await this.supS.Sup.from('entradas')
        .select('*', { count: 'exact', head: true })
        .in('funcion_id', ids)
        .is('anulada_en', null);
      if (errorEntradas !== null) {
        throw errorEntradas;
      }

      if (count !== null && count > 0) {
        tieneVentas = true;
      }
    }

    return tieneVentas;
  }

  async activarSala(id: string, activa: boolean): Promise<void> {
    if (activa === false) {
      const tieneVentas = await this.tieneVentasFuturas(id);

      if (tieneVentas) {
        throw new Error('La sala tiene funciones con entradas vendidas');
      }
    }

    const ahora = new Date().toISOString();
    const { error } = await this.supS.Sup.from('salas')
      .update({ activa: activa, actualizado_en: ahora })
      .eq('id', id);
    if (error !== null) {
      throw error;
    }
  }
}
