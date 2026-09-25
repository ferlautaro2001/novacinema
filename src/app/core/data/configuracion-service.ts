import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';

@Service()
export class ConfiguracionService {
  private supS = inject(Supabase);

  // Los valores se guardan como texto; el que lo usa lo convierte.
  async leer(clave: string): Promise<string | null> {
    const { data, error } = await this.supS.Sup.from('configuracion')
      .select('valor')
      .eq('clave', clave)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    let valor: string | null = null;

    if (data !== null) {
      valor = data.valor;
    }

    return valor;
  }
}
