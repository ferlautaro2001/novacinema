import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Producto = Tables<'productos'>;
export type ProductoPorCrear = TablesInsert<'productos'>;
export type ProductoPorModificar = TablesUpdate<'productos'>;

export type PedidoCandy = Tables<'pedidos_candy'>;
export type PedidoCandyPorCrear = TablesInsert<'pedidos_candy'>;
export type PedidoCandyPorModificar = TablesUpdate<'pedidos_candy'>;

export type PedidoItem = Tables<'pedido_items'>;
export type PedidoItemPorCrear = TablesInsert<'pedido_items'>;

export type RankingProducto = Tables<'v_ranking_productos'>;
