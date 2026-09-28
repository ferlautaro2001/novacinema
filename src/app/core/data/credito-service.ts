import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';

@Service()
export class CreditoService {
  private supS = inject(Supabase);

  // El crédito a favor del cliente (US-07.07). Sin movimientos la vista no
  // tiene fila y el saldo es cero. La RLS de movimientos_credito deja ver solo
  // los propios.
  async saldo(usuarioId: string): Promise<number> {
    // SELECT saldo FROM v_saldo_credito WHERE usuario_id = usuarioId
    const { data, error } = await this.supS.Sup.from('v_saldo_credito')
      .select('saldo')
      .eq('usuario_id', usuarioId)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    let saldo = 0;

    if (data !== null && data.saldo !== null) {
      saldo = Number(data.saldo);
    }

    return saldo;
  }
}
