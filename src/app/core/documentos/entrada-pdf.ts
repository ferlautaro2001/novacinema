import { formatCurrency, formatDate } from '@angular/common';
import { jsPDF } from 'jspdf';
import type { ComprobanteCompra } from '../models/compra';

const LOCALE = 'es-AR';

// Lo que va impreso en la entrada (AC-07.08.01). Los textos llegan ya
// formateados: este archivo solo los ubica en la hoja.
export interface DatosEntradaPdf {
  codigo: string;
  pelicula: string;
  clasificacion: string;
  fecha: string;
  hora: string;
  sala: string;
  formato: string;
  idioma: string;
  butacas: string;
  titular: string;
  total: string;
  // El pedido del Candy de la compra, si tiene ("2 × Gaseosa mediana").
  // Lo usa US-08.06; sin pedido la lista va vacía.
  candy: string[];
}

// Del comprobante de la base a los textos del PDF, con fechas y montos en es-AR
// como se ven en pantalla.
export function datosDelComprobante(comprobante: ComprobanteCompra): DatosEntradaPdf {
  const fecha = formatDate(comprobante.comienzaEn, 'EEEE d/MM/yyyy', LOCALE);
  const hora = formatDate(comprobante.comienzaEn, 'HH:mm', LOCALE);
  const total = formatCurrency(comprobante.total, LOCALE, '$', 'ARS', '1.0-2');
  const datos: DatosEntradaPdf = {
    codigo: comprobante.codigo,
    pelicula: comprobante.pelicula,
    clasificacion: comprobante.clasificacion,
    fecha,
    hora,
    sala: comprobante.sala,
    formato: comprobante.formato,
    idioma: comprobante.idioma,
    butacas: comprobante.butacas,
    titular: comprobante.titular,
    total,
    candy: comprobante.candy,
  };

  return datos;
}

// Colores de la marca, en RGB porque jsPDF no lee variables CSS.
const TERCIOPELO: [number, number, number] = [26, 15, 18];
const ROJO: [number, number, number] = [200, 16, 46];
const DORADO: [number, number, number] = [214, 168, 72];
const TINTA: [number, number, number] = [40, 30, 32];
const GRIS: [number, number, number] = [120, 108, 104];

const ANCHO = 148;
const MARGEN = 12;
const TAMANIO_QR = 44;
// Hasta dónde se puede escribir en la A5 (210 mm) sin pisar el pie.
const ALTO_UTIL = 196;

// Arma la entrada en A5 vertical y la descarga como NovaCinema-<código>.pdf.
// El QR llega como imagen (data URL PNG) del componente codigo-qr, y debajo se
// imprime el mismo código que contiene (AC-07.08.02).
//
// Se usa Helvetica, una de las fuentes estándar del PDF: cubre los acentos y
// la ñ sin tener que embeber una tipografía.
export function descargarEntradaPdf(datos: DatosEntradaPdf, qrPng: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });

  dibujarEncabezado(doc);

  let y = dibujarPelicula(doc, datos, 48);

  y = dibujarDatos(doc, datos, y + 6);

  if (datos.candy.length !== 0) {
    y = dibujarCandy(doc, datos.candy, y + 4);
  }

  // Con un pedido largo el QR no entra en la A5: va a una hoja nueva, entero.
  let yQr = y + 6;

  if (yQr + TAMANIO_QR + 12 > ALTO_UTIL) {
    doc.addPage();
    yQr = 20;
  }

  dibujarQr(doc, datos.codigo, qrPng, yQr);
  dibujarPie(doc);

  doc.save(`NovaCinema-${datos.codigo}.pdf`);
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function dibujarEncabezado(doc: jsPDF): void {
  doc.setFillColor(...TERCIOPELO);
  doc.rect(0, 0, ANCHO, 34, 'F');
  doc.setFillColor(...DORADO);
  doc.rect(0, 34, ANCHO, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...DORADO);
  doc.text('NOVACINEMA', MARGEN, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Tu entrada', MARGEN, 26);
}

// Título de la película (puede ocupar dos renglones) y su clasificación.
// Devuelve la altura donde terminó.
function dibujarPelicula(doc: jsPDF, datos: DatosEntradaPdf, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TINTA);

  const renglones: string[] = doc.splitTextToSize(datos.pelicula, ANCHO - MARGEN * 2);

  doc.text(renglones, MARGEN, y);

  const alto = renglones.length * 7;
  const yClasificacion = y + alto;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ROJO);
  doc.text(`Clasificación ${datos.clasificacion}`, MARGEN, yClasificacion);

  const fin = yClasificacion + 2;

  return fin;
}

// Los datos de la función en dos columnas de etiqueta y valor.
function dibujarDatos(doc: jsPDF, datos: DatosEntradaPdf, y: number): number {
  const filas: [string, string][] = [
    ['Fecha', datos.fecha],
    ['Hora', datos.hora],
    ['Sala', datos.sala],
    ['Formato', `${datos.formato} · ${datos.idioma}`],
    ['Butacas', datos.butacas],
    ['Titular', datos.titular],
    ['Total pagado', datos.total],
  ];

  let actual = y;

  for (const fila of filas) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(fila[0].toUpperCase(), MARGEN, actual);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TINTA);

    const valor: string[] = doc.splitTextToSize(fila[1], ANCHO - MARGEN * 2 - 34);

    doc.text(valor, MARGEN + 34, actual);
    actual = actual + 7 * valor.length;
  }

  return actual;
}

function dibujarCandy(doc: jsPDF, lineas: string[], y: number): number {
  doc.setDrawColor(...DORADO);
  doc.line(MARGEN, y - 4, ANCHO - MARGEN, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text('CANDY', MARGEN, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TINTA);

  let actual = y;

  for (const linea of lineas) {
    doc.text(linea, MARGEN + 34, actual);
    actual = actual + 6;
  }

  return actual;
}

// El QR centrado y, debajo, el mismo código en letra monoespaciada.
function dibujarQr(doc: jsPDF, codigo: string, qrPng: string, y: number): void {
  const x = (ANCHO - TAMANIO_QR) / 2;

  if (qrPng !== '') {
    doc.addImage(qrPng, 'PNG', x, y, TAMANIO_QR, TAMANIO_QR);
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TINTA);
  doc.text(codigo, ANCHO / 2, y + TAMANIO_QR + 7, { align: 'center' });
}

function dibujarPie(doc: jsPDF): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('Presentá este código en la entrada de la sala o en boletería.', ANCHO / 2, 200, {
    align: 'center',
  });
}
