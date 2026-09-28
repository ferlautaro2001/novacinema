import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Cupon, CuponPorCrear } from '../models/precio';

@Service()
export class CuponesService {
  private supS = inject(Supabase);

  // Los de mayores de 50 y los generales; el de primera compra se edita aparte.
  async listar(): Promise<Cupon[]> {
    // SELECT * FROM cupones
    //   WHERE tipo <> 'primera_compra' ORDER BY creado_en DESC
    const { data, error } = await this.supS.Sup.from('cupones')
      .select('*')
      .neq('tipo', 'primera_compra')
      .order('creado_en', { ascending: false });
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async buscarPorCodigo(codigo: string): Promise<Cupon | null> {
    // SELECT * FROM cupones WHERE codigo = codigo
    const { data, error } = await this.supS.Sup.from('cupones')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async primeraCompra(): Promise<Cupon> {
    // SELECT * FROM cupones WHERE tipo = 'primera_compra'
    const { data, error } = await this.supS.Sup.from('cupones')
      .select('*')
      .eq('tipo', 'primera_compra')
      .single();
    if (error !== null) {
      throw error;
    }

    return data;
  }

  // El beneficio de primera compra se gasta cuando se paga una compra con ese
  // cupón, y no vuelve aunque después se cancele (AC-07.06.01). Una compra que
  // se pagó con otro cupón no lo gasta (AC-07.06.03). Pagada o cancelada con
  // pagos cuenta como usada; una pendiente todavía no.
  async primeraCompraUsada(usuarioId: string): Promise<boolean> {
    // SELECT c.estado, count(p.id) FROM compra_cupones cc
    //   JOIN compras c ON c.id = cc.compra_id
    //   JOIN cupones cu ON cu.id = cc.cupon_id
    //   LEFT JOIN pagos p ON p.compra_id = c.id
    //   WHERE cu.tipo = 'primera_compra' AND c.usuario_id = usuarioId
    const { data, error } = await this.supS.Sup.from('compra_cupones')
      .select('compras!inner(estado, usuario_id, pagos(id)), cupones!inner(tipo)')
      .eq('cupones.tipo', 'primera_compra')
      .eq('compras.usuario_id', usuarioId);
    if (error !== null) {
      throw error;
    }

    let usada = false;

    for (const fila of data) {
      const compra = fila.compras;

      if (compra.estado === 'pagada' || compra.pagos.length !== 0) {
        usada = true;
      }
    }

    return usada;
  }

  async cambiarPorcentaje(id: string, porcentaje: number): Promise<void> {
    // UPDATE cupones SET porcentaje = porcentaje WHERE id = id
    const { error } = await this.supS.Sup.from('cupones')
      .update({ porcentaje: porcentaje })
      .eq('id', id);
    if (error !== null) {
      throw error;
    }
  }

  // El código es único en la base: si ya existe, Supabase devuelve el error 23505.
  async crear(cupon: CuponPorCrear): Promise<void> {
    // INSERT INTO cupones (codigo, tipo, porcentaje, activo) VALUES (...)
    const { error } = await this.supS.Sup.from('cupones').insert(cupon);
    if (error !== null) {
      if (error.code === '23505') {
        throw new Error('Ese código ya existe');
      }

      throw error;
    }
  }

  async cambiarActivo(id: string, activo: boolean): Promise<void> {
    // UPDATE cupones SET activo = activo WHERE id = id
    const { error } = await this.supS.Sup.from('cupones').update({ activo: activo }).eq('id', id);
    if (error !== null) {
      throw error;
    }
  }
}
