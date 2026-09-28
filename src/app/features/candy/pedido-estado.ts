import { computed, Service, signal } from '@angular/core';
import type { ProductoConPrecio } from '../../core/models/candy';

// Hasta 10 unidades de cada producto por pedido (AC-08.04.01).
export const MAXIMO_POR_PRODUCTO = 10;

// Una línea del pedido: el producto con su precio del menú y la cantidad.
export interface ItemPedido {
  producto: ProductoConPrecio;
  cantidad: number;
}

// Precio por cantidad de una línea del pedido.
export function subtotalDe(item: ItemPedido): number {
  let precio = 0;

  if (item.producto.precio !== null) {
    precio = item.producto.precio;
  }

  const subtotal = precio * item.cantidad;

  return subtotal;
}

// El pedido del Candy que el cliente va armando (US-08.04). Vive en un servicio
// para que sobreviva al pasar del menú al resumen de la compra o al pago: el
// mismo pedido se vincula después a una compra (US-08.05).
//
// Cada cambio arma una lista nueva con update(): quien la lee por signal ve el
// cambio sin que nadie mute la anterior.
@Service()
export class PedidoEstado {
  items = signal<ItemPedido[]>([]);

  total = computed(() => {
    let suma = 0;

    for (const item of this.items()) {
      suma = suma + subtotalDe(item);
    }

    return suma;
  });

  unidades = computed(() => {
    let cantidad = 0;

    for (const item of this.items()) {
      cantidad = cantidad + item.cantidad;
    }

    return cantidad;
  });

  cantidadDe(productoId: string): number {
    const item = buscarItem(this.items(), productoId);

    let cantidad = 0;

    if (item !== undefined) {
      cantidad = item.cantidad;
    }

    return cantidad;
  }

  // Devuelve false si ya estaba en el máximo, para que la pantalla avise.
  sumar(producto: ProductoConPrecio): boolean {
    const actual = this.cantidadDe(producto.id);

    let sumado = false;

    if (actual < MAXIMO_POR_PRODUCTO) {
      this.items.update((items) => conCantidad(items, producto, actual + 1));
      sumado = true;
    }

    return sumado;
  }

  restar(producto: ProductoConPrecio): void {
    const actual = this.cantidadDe(producto.id);

    if (actual > 0) {
      this.items.update((items) => conCantidad(items, producto, actual - 1));
    }
  }

  quitar(productoId: string): void {
    this.items.update((items) => sinProducto(items, productoId));
  }

  limpiar(): void {
    this.items.set([]);
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function buscarItem(items: ItemPedido[], productoId: string): ItemPedido | undefined {
  let encontrado: ItemPedido | undefined;

  for (const item of items) {
    if (item.producto.id === productoId) {
      encontrado = item;
    }
  }

  return encontrado;
}

// Una lista nueva con la cantidad cambiada. Con 0 el producto sale del pedido;
// uno que no estaba se agrega al final, en el orden en que se eligió.
function conCantidad(
  items: ItemPedido[],
  producto: ProductoConPrecio,
  cantidad: number,
): ItemPedido[] {
  const nuevos: ItemPedido[] = [];

  let estaba = false;

  for (const item of items) {
    if (item.producto.id === producto.id) {
      estaba = true;

      if (cantidad > 0) {
        nuevos.push({ producto: item.producto, cantidad });
      }
    } else {
      nuevos.push(item);
    }
  }

  if (estaba === false && cantidad > 0) {
    nuevos.push({ producto, cantidad });
  }

  return nuevos;
}

function sinProducto(items: ItemPedido[], productoId: string): ItemPedido[] {
  const restantes: ItemPedido[] = [];

  for (const item of items) {
    if (item.producto.id !== productoId) {
      restantes.push(item);
    }
  }

  return restantes;
}
