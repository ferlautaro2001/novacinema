import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { DatosProducto, ProductoConPrecio } from '../models/candy';

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

function porOrdenDeCategoria(a: FilaProducto, b: FilaProducto): number {
  const diferencia = a.categorias_producto.orden - b.categorias_producto.orden;

  return diferencia;
}
