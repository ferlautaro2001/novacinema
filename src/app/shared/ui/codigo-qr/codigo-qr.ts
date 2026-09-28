import { Component, ElementRef, inject, input } from '@angular/core';
import { QRCodeComponent } from 'angularx-qrcode';

// El QR de una compra con su código legible debajo (AC-07.08.02): el mismo
// texto que lleva el QR, para poder digitarlo a mano en boletería.
//
// Se dibuja en un canvas para que el PDF (core/documentos/entrada-pdf) use esta
// misma imagen: así el QR de la pantalla y el del papel salen de la misma
// librería (angularx-qrcode) y no pueden diferir.
@Component({
  selector: 'nc-codigo-qr',
  imports: [QRCodeComponent],
  templateUrl: './codigo-qr.html',
  styleUrl: './codigo-qr.css',
})
export class CodigoQr {
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  codigo = input.required<string>();
  // Ancho del QR en píxeles.
  tamanio = input(200);

  // La imagen del QR como data URL PNG, o '' si todavía no se dibujó.
  imagen(): string {
    const canvas = this.elemento.nativeElement.querySelector('canvas');

    let url = '';

    if (canvas !== null) {
      url = canvas.toDataURL('image/png');
    }

    return url;
  }
}
