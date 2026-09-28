import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type {
  CategoriaProducto,
  Clasificacion,
  Formato,
  Genero,
  MedioPago,
  TipoButaca,
  VersionIdioma,
} from '../models/catalogo';

// Tablas de referencia: solo las leo.
@Service()
export class CatalogoService {
  private supS = inject(Supabase);

  async findAllGeneros(): Promise<Genero[]> {
    // SELECT * FROM generos ORDER BY nombre
    const { data, error } = await this.supS.Sup.from('generos').select('*').order('nombre');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findGeneroById(id: number): Promise<Genero> {
    // SELECT * FROM generos WHERE id = id
    const { data, error } = await this.supS.Sup.from('generos').select('*').eq('id', id).single();
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findAllClasificaciones(): Promise<Clasificacion[]> {
    // SELECT * FROM clasificaciones ORDER BY edad_minima
    const { data, error } = await this.supS.Sup.from('clasificaciones')
      .select('*')
      .order('edad_minima');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findAllFormatos(): Promise<Formato[]> {
    // SELECT * FROM formatos ORDER BY id
    const { data, error } = await this.supS.Sup.from('formatos').select('*').order('id');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findAllVersionesIdioma(): Promise<VersionIdioma[]> {
    // SELECT * FROM versiones_idioma ORDER BY id
    const { data, error } = await this.supS.Sup.from('versiones_idioma').select('*').order('id');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findAllTiposButaca(): Promise<TipoButaca[]> {
    // SELECT * FROM tipos_butaca ORDER BY id
    const { data, error } = await this.supS.Sup.from('tipos_butaca').select('*').order('id');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findAllMediosPago(): Promise<MedioPago[]> {
    // SELECT * FROM medios_pago ORDER BY id
    const { data, error } = await this.supS.Sup.from('medios_pago').select('*').order('id');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async findAllCategoriasProducto(): Promise<CategoriaProducto[]> {
    // SELECT * FROM categorias_producto ORDER BY orden
    const { data, error } = await this.supS.Sup.from('categorias_producto')
      .select('*')
      .order('orden');
    if (error !== null) {
      throw error;
    }

    return data;
  }
}
