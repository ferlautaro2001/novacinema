import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { AdicionalFormatoPorCrear, PrecioButacaPorCrear } from '../models/precio';

// Las tablas de precios son un histórico: la tarifa vigente de cada tipo (o formato)
// es su fila con el vigente_desde más nuevo. Nunca actualizo, siempre inserto.
@Service()
export class PreciosService {
  private supS = inject(Supabase);

  // Tarifa vigente por id de tipo de butaca.
  async tarifasVigentes(): Promise<Map<number, number>> {
    const { data, error } = await this.supS.Sup.from('precios_butaca')
      .select('tipo_butaca_id, precio')
      .lte('vigente_desde', new Date().toISOString())
      .order('vigente_desde', { ascending: false });
    if (error) throw error;

    // Vienen de la más nueva a la más vieja: me quedo con la primera de cada tipo.
    const tarifas = new Map<number, number>();
    for (const fila of data) {
      if (!tarifas.has(fila.tipo_butaca_id)) {
        tarifas.set(fila.tipo_butaca_id, fila.precio);
      }
    }
    return tarifas;
  }

  // Adicional vigente por id de formato.
  async adicionalesVigentes(): Promise<Map<number, number>> {
    const { data, error } = await this.supS.Sup.from('adicionales_formato')
      .select('formato_id, adicional')
      .lte('vigente_desde', new Date().toISOString())
      .order('vigente_desde', { ascending: false });
    if (error) throw error;

    const adicionales = new Map<number, number>();
    for (const fila of data) {
      if (!adicionales.has(fila.formato_id)) {
        adicionales.set(fila.formato_id, fila.adicional);
      }
    }
    return adicionales;
  }

  // Recibe los valores del formulario y solo inserta los que cambiaron, así el
  // registro de actividad no se llena de cambios que no fueron. Devuelve cuántos
  // valores cambiaron.
  async guardar(tarifas: Map<number, number>, adicionales: Map<number, number>): Promise<number> {
    const tarifasActuales = await this.tarifasVigentes();
    const adicionalesActuales = await this.adicionalesVigentes();
    const ahora = new Date().toISOString();

    const preciosNuevos: PrecioButacaPorCrear[] = [];
    for (const [tipoId, precio] of tarifas) {
      if (tarifasActuales.get(tipoId) !== precio) {
        preciosNuevos.push({ tipo_butaca_id: tipoId, precio, vigente_desde: ahora });
      }
    }

    const adicionalesNuevos: AdicionalFormatoPorCrear[] = [];
    for (const [formatoId, adicional] of adicionales) {
      if (adicionalesActuales.get(formatoId) !== adicional) {
        adicionalesNuevos.push({ formato_id: formatoId, adicional, vigente_desde: ahora });
      }
    }

    if (preciosNuevos.length > 0) {
      const { error } = await this.supS.Sup.from('precios_butaca').insert(preciosNuevos);
      if (error) throw error;
    }
    if (adicionalesNuevos.length > 0) {
      const { error } = await this.supS.Sup.from('adicionales_formato').insert(adicionalesNuevos);
      if (error) throw error;
    }
    return preciosNuevos.length + adicionalesNuevos.length;
  }
}
