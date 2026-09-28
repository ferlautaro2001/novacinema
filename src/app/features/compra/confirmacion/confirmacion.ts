import { Component, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ComprasService } from '../../../core/data/compras-service';
import { datosDelComprobante, descargarEntradaPdf } from '../../../core/documentos/entrada-pdf';
import { CodigoQr } from '../../../shared/ui/codigo-qr/codigo-qr';
import { CompraEstado } from '../compra-estado';

// "¡Compra confirmada!" con el código y el QR de la compra (AC-07.07.03 y
// US-07.08). Lee lo que dejó el pago en CompraEstado; si se entra directo, sin
// una compra recién hecha, no hay nada que mostrar.
//
// "Descargar entrada" arma el PDF con jspdf (AC-07.08.01) con los datos de la
// base, pedido del Candy incluido (AC-08.06.02). El QR del PDF es la imagen del
// mismo nc-codigo-qr que se ve en pantalla.
@Component({
  selector: 'nc-confirmacion',
  imports: [CurrencyPipe, DatePipe, RouterLink, CodigoQr],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion {
  private compras = inject(ComprasService);
  compra = inject(CompraEstado);

  private qr = viewChild(CodigoQr);

  descargando = signal(false);
  errorDescarga = signal('');

  butacas(): string {
    const ids: string[] = [];

    for (const entrada of this.compra.entradas()) {
      ids.push(entrada.id);
    }

    const lista = ids.join(', ');

    return lista;
  }

  async descargar(): Promise<void> {
    const registrada = this.compra.confirmada();
    const qr = this.qr();

    if (registrada !== null && qr !== undefined && this.descargando() === false) {
      this.descargando.set(true);
      this.errorDescarga.set('');

      try {
        const comprobante = await this.compras.comprobante(registrada.id);
        const datos = datosDelComprobante(comprobante);
        const imagen = qr.imagen();

        descargarEntradaPdf(datos, imagen);
      } catch {
        this.errorDescarga.set('No se pudo armar el PDF. Probá de nuevo.');
      } finally {
        this.descargando.set(false);
      }
    }
  }
}
