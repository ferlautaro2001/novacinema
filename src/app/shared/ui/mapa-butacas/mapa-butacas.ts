import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ButacaMapa,
  FILAS,
  generarDistribucionSala,
  LayoutSala,
  TipoButaca,
} from './distribucion';
import { SiWebgl, soportaWebgl } from '../../directivas/si-webgl';
import { TipoButacaDirective } from '../../directivas/tipo-butaca';
import { Sala3dDirective } from './sala-3d';

@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
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
  zoom = signal<number>(1);
  camaraActiva = signal<string>('overview');
  modoFuncion = signal<boolean>(false);
  mensajeNotificacion = signal<string | null>(null);
  tooltipData = signal<{ butaca: ButacaMapa; x: number; y: number } | null>(null);

  seleccionInterna = signal<string[]>([]);
  notificacionTimer: any = null;

  sala3dRef = viewChild(Sala3dDirective);
  mapa2dContainer = viewChild<ElementRef<HTMLDivElement>>('mapScroll');

  layoutBase(): LayoutSala {
    return generarDistribucionSala();
  }

  butacasLista(): ButacaMapa[] {
    const custom = this.butacas();
    const base = custom && custom.length > 0 ? custom : this.layoutBase().butacas;
    const seleccionadasActuales =
      this.modo() === 'elegir'
        ? this.seleccionInterna().length > 0
          ? this.seleccionInterna()
          : this.seleccionadas()
        : [];

    return base.map((b) => ({
      ...b,
      seleccionada: seleccionadasActuales.includes(b.id),
    }));
  }

  filasVisuales() {
    const seats = this.butacasLista();
    const mapByFila: Record<string, (ButacaMapa | null)[]> = {};

    FILAS.forEach((letra) => {
      mapByFila[letra] = Array(30).fill(null);
    });

    for (const b of seats) {
      if (mapByFila[b.fila]) {
        mapByFila[b.fila][b.columna - 1] = b;
      }
    }

    return FILAS.map((letra, filaIndex) => ({
      letra,
      filaIndex,
      esVip: ['R', 'S', 'T'].includes(letra),
      esAccesible: letra === 'J',
      esCirculacion: letra === 'K',
      posiciones: mapByFila[letra] || [],
    }));
  }

  zoomPorcentaje(): number {
    return Math.round(this.zoom() * 100);
  }

  totalComunes(): number {
    return this.butacasLista().filter((b) => b.tipo === 'comun').length;
  }

  totalVip(): number {
    return this.butacasLista().filter((b) => b.tipo === 'vip').length;
  }

  totalAccesibles(): number {
    return this.butacasLista().filter((b) => b.tipo === 'accesible').length;
  }

  totalButacas(): number {
    return this.butacasLista().length;
  }

  seleccionDetalle(): ButacaMapa[] {
    const sel = this.seleccionInterna();
    return sel
      .map((id) => this.butacasLista().find((b) => b.id === id))
      .filter((b): b is ButacaMapa => b !== undefined);
  }

  totalPrecio(): number {
    const list = this.seleccionDetalle();
    const pr = this.precios();
    return list.reduce((acc, b) => acc + (pr[b.tipo] || 8500), 0);
  }

  nombreTipo(tipo: TipoButaca): string {
    switch (tipo) {
      case 'vip':
        return 'VIP';
      case 'accesible':
        return 'Accesible';
      default:
        return 'Común';
    }
  }

  estadoTexto(estado: string, seleccionada?: boolean): string {
    if (seleccionada) return 'Seleccionada';
    switch (estado) {
      case 'ocupada':
        return 'Ocupada';
      case 'bloqueada':
        return 'Bloqueada';
      default:
        return 'Disponible';
    }
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
      setTimeout(() => {
        this.sala3dRef()?.onResize();
      }, 50);
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
    const s3d = this.sala3dRef();
    if (s3d) {
      s3d.preset(camara);
    }
  }

  alternarModoFuncion(): void {
    const nuevo = !this.modoFuncion();
    this.modoFuncion.set(nuevo);
    this.mostrarNotificacion(
      nuevo ? 'Modo función: se apagan las luces…' : 'Luces de sala encendidas'
    );
  }

  tocarButaca(b: ButacaMapa, evento?: MouseEvent): void {
    if (this.modo() === 'ver') {
      // En modo 'ver' no se seleccionan butacas ni cambia selección
      this.mostrarTooltip(b, evento);
      return;
    }

    if (b.estado !== 'disponible') {
      this.mostrarNotificacion(
        b.estado === 'ocupada'
          ? `La butaca ${b.id} ya está ocupada`
          : `La butaca ${b.id} no está disponible`
      );
      return;
    }

    const actuales = this.seleccionInterna();
    const yaElegida = actuales.includes(b.id);

    if (!yaElegida && actuales.length >= 10) {
      this.mostrarNotificacion('Podés elegir hasta 10 butacas por compra');
      return;
    }

    const nuevas = yaElegida
      ? actuales.filter((id) => id !== b.id)
      : [...actuales, b.id];

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
    if (!ev.butaca) {
      this.ocultarTooltip();
    } else {
      this.tooltipData.set({ butaca: ev.butaca, x: ev.x, y: ev.y });
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
    if (this.notificacionTimer) clearTimeout(this.notificacionTimer);
    this.notificacionTimer = setTimeout(() => {
      this.mensajeNotificacion.set(null);
    }, 2800);
  }

  emitirContinuar(): void {
    if (this.seleccionInterna().length > 0) {
      this.continuar.emit(this.seleccionInterna());
    }
  }

  onKeydown(event: KeyboardEvent, filaIndex: number, colIndex: number): void {
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const dir = dirs[event.key];
    if (!dir) return;

    event.preventDefault();
    const filas = this.filasVisuales();
    let r = filaIndex + dir[0];
    let c = colIndex + dir[1];

    while (r >= 0 && r < filas.length && c >= 0 && c < 30) {
      const b = filas[r]?.posiciones[c];
      if (b) {
        const el = document.querySelector<HTMLButtonElement>(
          `button[data-id="${b.id}"]`
        );
        el?.focus();
        return;
      }
      r += dir[0];
      c += dir[1];
    }
  }
}
