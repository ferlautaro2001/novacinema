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

// Un producto como lo lista el Panel (US-08.01): con el nombre de su categoría y
// el precio vigente, que vive en precios_producto porque es un histórico.
export interface ProductoConPrecio {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  categoriaId: number;
  imagenPath: string;
  activo: boolean;
  // null si todavía no tiene un precio vigente.
  precio: number | null;
}

// Lo que carga el formulario de alta.
export interface DatosProducto {
  nombre: string;
  descripcion: string;
  categoriaId: number;
  imagenPath: string;
  precio: number;
}

// Una sección del menú del Candy (US-08.03): la categoría con sus productos
// disponibles, en el orden de la carta.
export interface CategoriaDelMenu {
  id: number;
  nombre: string;
  productos: ProductoConPrecio[];
}

// Una compra a la que se le puede sumar un pedido del Candy (AC-08.05.01):
// propia, pagada, con la función sin terminar y todavía sin pedido.
export interface CompraVigente {
  id: string;
  codigo: string;
  pelicula: string;
  sala: string;
  comienzaEn: Date;
}

// Cómo quedó pagado un pedido del Candy (US-08.06), con los montos de la base.
export interface PedidoPagado {
  pedidoId: string;
  total: number;
  credito: number;
  tarjeta: number;
}
