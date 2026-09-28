import { Component, inject, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import type { ProductoConPrecio } from '../../../core/models/candy';
import { Cantidad } from '../cantidad/cantidad';
import { PedidoEstado, subtotalDe } from '../pedido-estado';

// "Tu pedido": cada producto con su cantidad y subtotal, y el total (AC-08.04.01).
// Lee y cambia el PedidoEstado; lo que se hace con el pedido (confirmarlo,
// sumarlo a una compra) entra por el slot [acciones].
@Component({
  selector: 'nc-resumen-pedido',
  imports: [CurrencyPipe, Cantidad],
  templateUrl: './resumen-pedido.html',
  styleUrl: './resumen-pedido.css',
})
export class ResumenPedido {
  pedido = inject(PedidoEstado);

  // Avisa cuando se intentó pasar el máximo, para que la pantalla lo muestre.
  maximo = output<void>();

  sumar(producto: ProductoConPrecio): void {
    const sumado = this.pedido.sumar(producto);

    if (sumado === false) {
      this.maximo.emit();
    }
  }

  subtotal = subtotalDe;
}
