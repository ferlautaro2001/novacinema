import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { AdicionalFormatoPorCrear, PrecioButacaPorCrear } from '../models/precio';

// Las tablas de precios son un histórico: la tarifa vigente de cada tipo (o formato)
// es su fila con el vigente_desde más nuevo. Nunca actualizo, siempre inserto.
@Service()
export class PreciosService {
  private supS = inject(Supabase);

  // Tarifa vigente por id de tipo de butaca. La vista ya trae una sola fila por
  // tipo: la del vigente_desde más nuevo que todavía no venció. Antes se traían
  // todas y se descartaban en el código.
  async tarifasVigentes(): Promise<Map<number, number>> {
    // SELECT tipo_butaca_id, precio FROM v_precios_vigentes
    const { data, error } = await this.supS.Sup.from('v_precios_vigentes').select(
      'tipo_butaca_id, precio',
    );
    if (error !== null) {
      throw error;
    }

    const tarifas = new Map<number, number>();

    for (const fila of data) {
      tarifas.set(fila.tipo_butaca_id, fila.precio);
    }

    return tarifas;
  }

  // Adicional vigente por id de formato. Misma idea que las tarifas: la vista
  // deja una sola fila por formato.
  async adicionalesVigentes(): Promise<Map<number, number>> {
    // SELECT formato_id, adicional FROM v_adicionales_vigentes
    const { data, error } = await this.supS.Sup.from('v_adicionales_vigentes').select(
      'formato_id, adicional',
    );
    if (error !== null) {
      throw error;
    }

    const adicionales = new Map<number, number>();

    for (const fila of data) {
      adicionales.set(fila.formato_id, fila.adicional);
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
        const precioNuevo: PrecioButacaPorCrear = {
          tipo_butaca_id: tipoId,
          precio: precio,
          vigente_desde: ahora,
        };

        preciosNuevos.push(precioNuevo);
      }
    }

    const adicionalesNuevos: AdicionalFormatoPorCrear[] = [];

    for (const [formatoId, adicional] of adicionales) {
      if (adicionalesActuales.get(formatoId) !== adicional) {
        const adicionalNuevo: AdicionalFormatoPorCrear = {
          formato_id: formatoId,
          adicional: adicional,
          vigente_desde: ahora,
        };

        adicionalesNuevos.push(adicionalNuevo);
      }
    }

    if (preciosNuevos.length > 0) {
      // INSERT INTO precios_butaca (tipo_butaca_id, precio, vigente_desde) VALUES (...)
      const { error } = await this.supS.Sup.from('precios_butaca').insert(preciosNuevos);
      if (error !== null) {
        throw error;
      }
    }

    if (adicionalesNuevos.length > 0) {
      // INSERT INTO adicionales_formato (formato_id, adicional, vigente_desde) VALUES (...)
      const { error } = await this.supS.Sup.from('adicionales_formato').insert(adicionalesNuevos);
      if (error !== null) {
        throw error;
      }
    }

    const cantidadCambios = preciosNuevos.length + adicionalesNuevos.length;

    return cantidadCambios;
  }
}
