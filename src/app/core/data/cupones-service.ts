import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Cupon, CuponPorCrear } from '../models/precio';

@Service()
export class CuponesService {
  private supS = inject(Supabase);

  // Los de mayores de 50 y los generales; el de primera compra se edita aparte.
  async listar(): Promise<Cupon[]> {
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
    const { error } = await this.supS.Sup.from('cupones')
      .update({ porcentaje: porcentaje })
      .eq('id', id);
    if (error !== null) {
      throw error;
    }
  }

  // El código es único en la base: si ya existe, Supabase devuelve el error 23505.
  async crear(cupon: CuponPorCrear): Promise<void> {
    const { error } = await this.supS.Sup.from('cupones').insert(cupon);
    if (error !== null) {
      if (error.code === '23505') {
        throw new Error('Ese código ya existe');
      }

      throw error;
    }
  }

  async cambiarActivo(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supS.Sup.from('cupones').update({ activo: activo }).eq('id', id);
    if (error !== null) {
      throw error;
    }
  }
}
