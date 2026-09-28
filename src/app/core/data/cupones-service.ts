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
