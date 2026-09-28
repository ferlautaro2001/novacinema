import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompraEstado } from '../compra-estado';

// "¡Compra confirmada!" con el código de la compra (AC-07.07.03). Lee lo que
// dejó el pago en CompraEstado; si se entra directo, sin una compra recién
// hecha, no hay nada que mostrar.
//
// La descarga de la entrada en PDF con QR llega con US-07.08.
@Component({
  selector: 'nc-confirmacion',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion {
  compra = inject(CompraEstado);

  butacas(): string {
    const ids: string[] = [];

    for (const entrada of this.compra.entradas()) {
      ids.push(entrada.id);
    }

    const lista = ids.join(', ');

    return lista;
  }
}
