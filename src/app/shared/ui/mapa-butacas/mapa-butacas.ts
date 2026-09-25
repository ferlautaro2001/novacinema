import { Component, input, output, signal, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ButacaMapa,
  FILAS,
  FILAS_VIP,
  generarDistribucionSala,
  TipoButaca,
  TOTAL_COLUMNAS,
} from './distribucion';
import { SiWebgl, soportaWebgl } from '../../directivas/si-webgl';
import { TipoButacaDirective } from '../../directivas/tipo-butaca';
import { Sala3dDirective } from './sala-3d';

@Component({
  selector: 'app-mapa-butacas',
  imports: [CommonModule, SiWebgl, TipoButacaDirective, Sala3dDirective],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
})
export class MapaButacasComponent {
  modo = input<'ver' | 'elegir'>('ver');
  butacas = input<ButacaMapa[] | null>(null);
  seleccionadas = input<string[]>([]);
  precios = input<Record<string, number>>({
    comun: 8500,
    vip: 14500,
    accesible: 8500,
  });
  tooltipTemplate = input<TemplateRef<any> | null>(null);

  butacaTocada = output<ButacaMapa>();
  seleccionCambiada = output<string[]>();
  continuar = output<string[]>();

  vista = signal<'2d' | '3d'>('2d');
  soporta = soportaWebgl();
  zoom = signal(1);
  camaraActiva = signal('overview');
  modoFuncion = signal(false);
  mensajeNotificacion = signal<string | null>(null);
  tooltipData = signal<{ butaca: ButacaMapa; x: number; y: number } | null>(null);
  seleccionInterna = signal<string[]>([]);

  sala3d = viewChild(Sala3dDirective);

  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  butacasLista(): ButacaMapa[] {
    const recibidas = this.butacas();
    const base = recibidas && recibidas.length > 0 ? recibidas : generarDistribucionSala().butacas;

    // En modo 'ver' no se marca ninguna; en 'elegir' manda la selección interna
    // y, mientras esté vacía, la que llega por input.
    let elegidas: string[] = [];
    if (this.modo() === 'elegir') {
      elegidas =
        this.seleccionInterna().length > 0 ? this.seleccionInterna() : this.seleccionadas();
    }

    return base.map((b) => ({ ...b, seleccionada: elegidas.includes(b.id) }));
  }

  filasVisuales() {
    const porFila: Record<string, (ButacaMapa | null)[]> = {};
    for (const letra of FILAS) {
      porFila[letra] = Array(TOTAL_COLUMNAS).fill(null);
    }
    for (const b of this.butacasLista()) {
      if (porFila[b.fila]) porFila[b.fila][b.columna - 1] = b;
    }

    return FILAS.map((letra, filaIndex) => ({
      letra,
      filaIndex,
      esVip: FILAS_VIP.includes(letra),
      esAccesible: letra === 'J',
      esCirculacion: letra === 'K',
      posiciones: porFila[letra],
    }));
  }

  zoomPorcentaje(): number {
    return Math.round(this.zoom() * 100);
  }

  seleccionDetalle(): ButacaMapa[] {
    const lista = this.butacasLista();
    const detalle: ButacaMapa[] = [];
    for (const id of this.seleccionInterna()) {
      const butaca = lista.find((b) => b.id === id);
      if (butaca) detalle.push(butaca);
    }
    return detalle;
  }

  totalPrecio(): number {
    const precios = this.precios();
    let total = 0;
    for (const b of this.seleccionDetalle()) {
      total += precios[b.tipo] || 8500;
    }
    return total;
  }

  nombreTipo(tipo: TipoButaca): string {
    if (tipo === 'vip') return 'VIP';
    if (tipo === 'accesible') return 'Accesible';
    return 'Común';
  }

  estadoTexto(estado: string, seleccionada?: boolean): string {
    if (seleccionada) return 'Seleccionada';
    if (estado === 'ocupada') return 'Ocupada';
    if (estado === 'bloqueada') return 'Bloqueada';
    return 'Disponible';
  }

  cambiarVista(nueva: '2d' | '3d'): void {
    if (nueva === '3d' && !this.soporta) {
      this.mostrarNotificacion('3D no disponible en este navegador');
      return;
    }
    this.vista.set(nueva);
    this.ocultarTooltip();
    if (nueva === '2d') {
      this.ajustarZoom();
    } else {
      // Espero a que el contenedor deje de estar oculto para que el canvas tome su tamaño.
      setTimeout(() => this.sala3d()?.onResize(), 50);
    }
  }

  acercarZoom(): void {
    this.zoom.update((z) => Math.min(1.8, Math.round((z + 0.1) * 10) / 10));
  }

  alejarZoom(): void {
    this.zoom.update((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10));
  }

  ajustarZoom(): void {
    this.zoom.set(1);
  }

  cambiarCamara(camara: string): void {
    this.camaraActiva.set(camara);
    this.sala3d()?.preset(camara);
  }

  alternarModoFuncion(): void {
    const activo = !this.modoFuncion();
    this.modoFuncion.set(activo);
    this.mostrarNotificacion(
      activo ? 'Modo función: se apagan las luces…' : 'Luces de sala encendidas',
    );
  }

  tocarButaca(b: ButacaMapa, evento?: MouseEvent): void {
    if (this.modo() === 'ver') {
      this.mostrarTooltip(b, evento);
      return;
    }

    if (b.estado === 'ocupada') {
      this.mostrarNotificacion(`La butaca ${b.id} ya está ocupada`);
      return;
    }
    if (b.estado !== 'disponible') {
      this.mostrarNotificacion(`La butaca ${b.id} no está disponible`);
      return;
    }

    const actuales = this.seleccionInterna();
    const yaElegida = actuales.includes(b.id);

    if (!yaElegida && actuales.length >= 10) {
      this.mostrarNotificacion('Podés elegir hasta 10 butacas por compra');
      return;
    }

    const nuevas = yaElegida ? actuales.filter((id) => id !== b.id) : [...actuales, b.id];
    this.seleccionInterna.set(nuevas);
    this.seleccionCambiada.emit(nuevas);
    this.butacaTocada.emit(b);
  }

  quitarButaca(id: string): void {
    const nuevas = this.seleccionInterna().filter((x) => x !== id);
    this.seleccionInterna.set(nuevas);
    this.seleccionCambiada.emit(nuevas);
  }

  onHover3D(ev: { butaca: ButacaMapa | null; x: number; y: number }): void {
    if (ev.butaca) {
      this.tooltipData.set({ butaca: ev.butaca, x: ev.x, y: ev.y });
    } else {
      this.ocultarTooltip();
    }
  }

  mostrarTooltip(b: ButacaMapa, evento?: MouseEvent): void {
    const x = evento ? evento.clientX + 10 : 200;
    const y = evento ? evento.clientY + 10 : 200;
    this.tooltipData.set({ butaca: b, x, y });
  }

  ocultarTooltip(): void {
    this.tooltipData.set(null);
  }

  mostrarNotificacion(mensaje: string): void {
    this.mensajeNotificacion.set(mensaje);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.mensajeNotificacion.set(null), 2800);
  }

  emitirContinuar(): void {
    if (this.seleccionInterna().length > 0) {
      this.continuar.emit(this.seleccionInterna());
    }
  }

  // Con las flechas salto a la próxima butaca en esa dirección, pasando por encima de
  // pasillos y huecos.
  onKeydown(event: KeyboardEvent, filaIndex: number, colIndex: number): void {
    const direcciones: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const dir = direcciones[event.key];
    if (!dir) return;

    event.preventDefault();
    const filas = this.filasVisuales();
    let f = filaIndex + dir[0];
    let c = colIndex + dir[1];

    while (f >= 0 && f < filas.length && c >= 0 && c < TOTAL_COLUMNAS) {
      const b = filas[f].posiciones[c];
      if (b) {
        document.querySelector<HTMLButtonElement>(`button[data-id="${b.id}"]`)?.focus();
        return;
      }
      f += dir[0];
      c += dir[1];
    }
  }
}
