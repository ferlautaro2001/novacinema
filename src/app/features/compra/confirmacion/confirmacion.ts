import { Component, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe, formatCurrency, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { descargarEntradaPdf, type DatosEntradaPdf } from '../../../core/documentos/entrada-pdf';
import type { CompraRegistrada } from '../../../core/data/compras-service';
import type { FuncionParaComprar } from '../../../core/models/funcion';
import { CodigoQr } from '../../../shared/ui/codigo-qr/codigo-qr';
import { CompraEstado } from '../compra-estado';

const LOCALE = 'es-AR';

// "¡Compra confirmada!" con el código y el QR de la compra (AC-07.07.03 y
// US-07.08). Lee lo que dejó el pago en CompraEstado; si se entra directo, sin
// una compra recién hecha, no hay nada que mostrar.
//
// "Descargar entrada" arma el PDF con jspdf (AC-07.08.01). El QR del PDF es la
// imagen del mismo nc-codigo-qr que se ve en pantalla.
@Component({
  selector: 'nc-confirmacion',
  imports: [CurrencyPipe, DatePipe, RouterLink, CodigoQr],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion {
  private peliculas = inject(PeliculasService);
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
    const funcion = this.compra.funcion();
    const qr = this.qr();

    if (
      registrada !== null &&
      funcion !== null &&
      qr !== undefined &&
      this.descargando() === false
    ) {
      this.descargando.set(true);
      this.errorDescarga.set('');

      try {
        const datos = await this.datosDelPdf(registrada, funcion);
        const imagen = qr.imagen();

        descargarEntradaPdf(datos, imagen);
      } catch {
        this.errorDescarga.set('No se pudo armar el PDF. Probá de nuevo.');
      } finally {
        this.descargando.set(false);
      }
    }
  }

  // La clasificación no viaja en la función elegida: se busca en la película.
  private async datosDelPdf(
    registrada: CompraRegistrada,
    funcion: FuncionParaComprar,
  ): Promise<DatosEntradaPdf> {
    const pelicula = await this.peliculas.buscar(funcion.peliculaId);
    const fecha = formatDate(funcion.comienzaEn, 'EEEE d/MM/yyyy', LOCALE);
    const hora = formatDate(funcion.comienzaEn, 'HH:mm', LOCALE);
    const total = formatCurrency(registrada.total, LOCALE, '$', 'ARS', '1.0-2');
    const datos: DatosEntradaPdf = {
      codigo: registrada.codigo,
      pelicula: funcion.peliculaTitulo,
      clasificacion: pelicula.clasificacion.codigo,
      fecha,
      hora,
      sala: funcion.sala,
      formato: funcion.formato,
      idioma: funcion.idioma,
      butacas: this.butacas(),
      titular: this.compra.titular(),
      total,
      candy: [],
    };

    return datos;
  }
}
