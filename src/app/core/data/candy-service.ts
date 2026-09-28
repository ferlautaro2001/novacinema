import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { CategoriaDelMenu, DatosProducto, ProductoConPrecio } from '../models/candy';

// El error de Postgres cuando una FK impide borrar: el producto ya se usó.
const CODIGO_EN_USO = '23503';

// Un rechazo que el administrador tiene que leer tal cual (AC-08.02.03).
export class ProductoRechazado extends Error {}

// La fila del listado tal como la devuelve PostgREST, con la categoría y los
// precios embebidos.
interface FilaProducto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria_id: number;
  imagen_path: string;
  activo: boolean;
  categorias_producto: { nombre: string; orden: number };
  precios_producto: { precio: number; vigente_desde: string }[];
}

@Service()
export class CandyService {
  private supS = inject(Supabase);

  // Todos los productos, disponibles o no, para el Panel (US-08.01). Ordenados
  // por categoría y nombre, como se piensa el menú.
  async listarParaPanel(): Promise<ProductoConPrecio[]> {
    // SELECT p.*, c.nombre, pp.precio, pp.vigente_desde FROM productos p
    //   JOIN categorias_producto c ON c.id = p.categoria_id
    //   LEFT JOIN precios_producto pp ON pp.producto_id = p.id
    //   ORDER BY c.orden, p.nombre
    const { data, error } = await this.supS.Sup.from('productos')
      .select(
        'id, nombre, descripcion, categoria_id, imagen_path, activo, categorias_producto!inner(nombre, orden), precios_producto(precio, vigente_desde)',
      )
      .order('nombre');
    if (error !== null) {
      throw error;
    }

    // PostgREST no ordena la tabla principal por una columna embebida: el orden
    // de la categoría se aplica acá. sort es estable, así que dentro de cada
    // categoría queda el orden por nombre que ya vino de la base.
    const filas: FilaProducto[] = [...data];
    const ordenadas = filas.sort(porOrdenDeCategoria);
    const productos: ProductoConPrecio[] = [];
    const ahora = new Date();

    for (const fila of ordenadas) {
      const producto = aProductoConPrecio(fila, ahora);

      productos.push(producto);
    }

    return productos;
  }

  // El menú del Candy (US-08.03): solo lo disponible, con precio vigente,
  // agrupado por categoría en el orden de la carta (AC-08.03.01). Un producto
  // sin precio vigente no se puede vender, así que no se muestra.
  async listarMenu(): Promise<CategoriaDelMenu[]> {
    // SELECT p.*, c.nombre, c.orden, pp.precio, pp.vigente_desde FROM productos p
    //   JOIN categorias_producto c ON c.id = p.categoria_id
    //   LEFT JOIN precios_producto pp ON pp.producto_id = p.id
    //   WHERE p.activo ORDER BY c.orden, p.nombre
    const { data, error } = await this.supS.Sup.from('productos')
      .select(
        'id, nombre, descripcion, categoria_id, imagen_path, activo, categorias_producto!inner(nombre, orden), precios_producto(precio, vigente_desde)',
      )
      .eq('activo', true)
      .order('nombre');
    if (error !== null) {
      throw error;
    }

    const filas: FilaProducto[] = [...data];
    const ordenadas = filas.sort(porOrdenDeCategoria);
    const ahora = new Date();
    const categorias: CategoriaDelMenu[] = [];

    for (const fila of ordenadas) {
      const producto = aProductoConPrecio(fila, ahora);

      if (producto.precio !== null) {
        agregarAlMenu(categorias, producto);
      }
    }

    return categorias;
  }

  // Da de alta el producto disponible y su primer precio (AC-08.01.01). El
  // precio va aparte porque precios_producto es un histórico: así el registro de
  // actividad sabe quién puso cada precio. Si el precio no se guarda, se borra el
  // producto para no dejar uno sin precio.
  async crear(datos: DatosProducto): Promise<void> {
    // INSERT INTO productos (nombre, descripcion, categoria_id, imagen_path) VALUES (...) RETURNING id
    const { data, error } = await this.supS.Sup.from('productos')
      .insert({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        categoria_id: datos.categoriaId,
        imagen_path: datos.imagenPath,
      })
      .select('id')
      .single();
    if (error !== null) {
      throw error;
    }

    const ahora = new Date().toISOString();
    // INSERT INTO precios_producto (producto_id, precio, vigente_desde) VALUES (...)
    const { error: errorPrecio } = await this.supS.Sup.from('precios_producto').insert({
      producto_id: data.id,
      precio: datos.precio,
      vigente_desde: ahora,
    });
    if (errorPrecio !== null) {
      // DELETE FROM productos WHERE id = data.id
      await this.supS.Sup.from('productos').delete().eq('id', data.id);
      throw errorPrecio;
    }
  }

  // Guarda los cambios del producto (US-08.02). Si el precio cambió, se agrega
  // una fila nueva en precios_producto en vez de pisar la anterior: así el
  // registro de actividad muestra "$6.500 → $7.000" (AC-08.02.01).
  async actualizar(id: string, datos: DatosProducto, precioActual: number | null): Promise<void> {
    // UPDATE productos SET nombre, descripcion, categoria_id, imagen_path WHERE id = id
    const { error } = await this.supS.Sup.from('productos')
      .update({
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        categoria_id: datos.categoriaId,
        imagen_path: datos.imagenPath,
      })
      .eq('id', id);
    if (error !== null) {
      throw error;
    }

    if (datos.precio !== precioActual) {
      const ahora = new Date().toISOString();
      // INSERT INTO precios_producto (producto_id, precio, vigente_desde) VALUES (...)
      const { error: errorPrecio } = await this.supS.Sup.from('precios_producto').insert({
        producto_id: id,
        precio: datos.precio,
        vigente_desde: ahora,
      });
      if (errorPrecio !== null) {
        throw errorPrecio;
      }
    }
  }

  // Baja lógica (AC-08.02.02): un producto no disponible deja de salir en el
  // menú pero conserva sus pedidos y su historial de precios.
  async cambiarDisponibilidad(id: string, activo: boolean): Promise<void> {
    // UPDATE productos SET activo = activo WHERE id = id
    const { error } = await this.supS.Sup.from('productos').update({ activo: activo }).eq('id', id);
    if (error !== null) {
      throw error;
    }
  }

  // Solo se borra un producto que nunca se usó (AC-08.02.03). Sus precios se van
  // en cascada; si tiene pedidos o es parte de una recompensa, la FK lo impide y
  // se sugiere marcarlo no disponible. Se pregunta antes para poder decir cuál de
  // las dos cosas lo frena.
  async eliminar(id: string): Promise<void> {
    const pedidos = await this.contar('pedido_items', id);
    const recompensas = await this.contar('recompensa_items', id);

    if (pedidos > 0) {
      throw new ProductoRechazado('El producto tiene pedidos. Marcalo como no disponible');
    }

    if (recompensas > 0) {
      throw new ProductoRechazado(
        'El producto es parte de una recompensa. Marcalo como no disponible',
      );
    }

    // DELETE FROM productos WHERE id = id (precios_producto en cascada)
    const { error } = await this.supS.Sup.from('productos').delete().eq('id', id);
    if (error !== null) {
      if (error.code === CODIGO_EN_USO) {
        throw new ProductoRechazado('El producto tiene pedidos. Marcalo como no disponible');
      }

      throw error;
    }
  }

  private async contar(
    tabla: 'pedido_items' | 'recompensa_items',
    productoId: string,
  ): Promise<number> {
    // SELECT count(*) FROM <tabla> WHERE producto_id = productoId
    const { count, error } = await this.supS.Sup.from(tabla)
      .select('producto_id', { count: 'exact', head: true })
      .eq('producto_id', productoId);
    if (error !== null) {
      throw error;
    }

    let cantidad = 0;

    if (count !== null) {
      cantidad = count;
    }

    return cantidad;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function aProductoConPrecio(fila: FilaProducto, ahora: Date): ProductoConPrecio {
  const precio = precioVigente(fila.precios_producto, ahora);
  const producto: ProductoConPrecio = {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    categoria: fila.categorias_producto.nombre,
    categoriaId: fila.categoria_id,
    imagenPath: fila.imagen_path,
    activo: fila.activo,
    precio,
  };

  return producto;
}

// El último precio que ya empezó a regir. Uno cargado a futuro todavía no vale.
function precioVigente(
  precios: { precio: number; vigente_desde: string }[],
  ahora: Date,
): number | null {
  let vigente: number | null = null;
  let desdeVigente: Date | null = null;

  for (const fila of precios) {
    const desde = new Date(fila.vigente_desde);

    if (desde <= ahora && (desdeVigente === null || desde > desdeVigente)) {
      vigente = Number(fila.precio);
      desdeVigente = desde;
    }
  }

  return vigente;
}

// Las filas llegan ordenadas por categoría: se abre una sección nueva cada vez
// que cambia.
function agregarAlMenu(categorias: CategoriaDelMenu[], producto: ProductoConPrecio): void {
  const ultima = categorias[categorias.length - 1];

  if (ultima !== undefined && ultima.id === producto.categoriaId) {
    ultima.productos.push(producto);
  } else {
    categorias.push({
      id: producto.categoriaId,
      nombre: producto.categoria,
      productos: [producto],
    });
  }
}

function porOrdenDeCategoria(a: FilaProducto, b: FilaProducto): number {
  const diferencia = a.categorias_producto.orden - b.categorias_producto.orden;

  return diferencia;
}
