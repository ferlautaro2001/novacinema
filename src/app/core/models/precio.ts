/* Armé los precios como histórico: cada fila vale desde su `vigente_desde`.
   Nunca modifico una fila existente, inserto una nueva, así queda el registro de
   cuánto salía una entrada en cada momento. */
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type PrecioButaca = Tables<'precios_butaca'>;
export type PrecioButacaPorCrear = TablesInsert<'precios_butaca'>;

export type PrecioProducto = Tables<'precios_producto'>;
export type PrecioProductoPorCrear = TablesInsert<'precios_producto'>;

export type AdicionalFormato = Tables<'adicionales_formato'>;
export type AdicionalFormatoPorCrear = TablesInsert<'adicionales_formato'>;

export type Preventa = Tables<'preventas'>;
export type PreventaPorCrear = TablesInsert<'preventas'>;
export type PreventaPorModificar = TablesUpdate<'preventas'>;

export type Cupon = Tables<'cupones'>;
export type CuponPorCrear = TablesInsert<'cupones'>;
export type CuponPorModificar = TablesUpdate<'cupones'>;
