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

// Devuelvo los datos ya desempaquetados en vez del { data, error } crudo de
// Supabase, y si viene error lo tiro. Así el componente recibe el array y listo,
// y el manejo del error queda en un solo lugar en vez de repetirse en cada
// pantalla.
@Service()
export class CatalogoService {
  private readonly supS = inject(Supabase);

  async findAllGeneros(): Promise<Genero[]> {
    const { data, error } = await this.supS.Sup.from('generos').select('*').order('nombre');
    if (error) throw error;
    return data;
  }

  async findGeneroById(id: number): Promise<Genero> {
    const { data, error } = await this.supS.Sup.from('generos').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async findAllClasificaciones(): Promise<Clasificacion[]> {
    const { data, error } = await this.supS.Sup.from('clasificaciones')
      .select('*')
      .order('edad_minima');
    if (error) throw error;
    return data;
  }

  async findAllFormatos(): Promise<Formato[]> {
    const { data, error } = await this.supS.Sup.from('formatos').select('*').order('id');
    if (error) throw error;
    return data;
  }

  async findAllVersionesIdioma(): Promise<VersionIdioma[]> {
    const { data, error } = await this.supS.Sup.from('versiones_idioma').select('*').order('id');
    if (error) throw error;
    return data;
  }

  async findAllTiposButaca(): Promise<TipoButaca[]> {
    const { data, error } = await this.supS.Sup.from('tipos_butaca').select('*').order('id');
    if (error) throw error;
    return data;
  }

  async findAllMediosPago(): Promise<MedioPago[]> {
    const { data, error } = await this.supS.Sup.from('medios_pago').select('*').order('id');
    if (error) throw error;
    return data;
  }

  async findAllCategoriasProducto(): Promise<CategoriaProducto[]> {
    const { data, error } = await this.supS.Sup.from('categorias_producto')
      .select('*')
      .order('orden');
    if (error) throw error;
    return data;
  }
}
