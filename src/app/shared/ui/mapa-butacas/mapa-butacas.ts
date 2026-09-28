import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
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
  // La butaca desde la que se mira en la vista POV ("Desde mi butaca"). La avisa
  // la sala 3D: con el id se muestra "Vista desde H11".
  vistaDesde = signal<string | null>(null);

  sala3d = viewChild(Sala3dDirective);

  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  // Si una butaca de la selección llega ocupada por input, otra compra la vendió
  // mientras el cliente elegía: se saca de la selección y se avisa (AC-07.05.01).
  // La selección se lee sin seguirla para que el efecto corra solo cuando cambian
  // las butacas.
  private quitarVendidas = effect(() => {
    const recibidas = this.butacas();

    untracked(() => this.soltarOcupadas(recibidas));
  });

  // Es un computed y no un método para que el array sea siempre el mismo mientras
  // no cambien las entradas: la escena 3D recibe el array por input y lo recorre
  // entero en cada cambio.
  butacasLista = computed(() => {
    const recibidas = this.butacas();

    let base: ButacaMapa[];

    if (recibidas !== null && recibidas.length > 0) {
      base = recibidas;
    } else {
      const distribucion = generarDistribucionSala();
      base = distribucion.butacas;
    }

    // En modo 'ver' no se marca ninguna; en 'elegir' manda la selección interna
    // y, mientras esté vacía, la que llega por input.
    let elegidas: string[] = [];

    if (this.modo() === 'elegir') {
      const internas = this.seleccionInterna();

      if (internas.length > 0) {
        elegidas = internas;
      } else {
        elegidas = this.seleccionadas();
      }
    }

    const lista: ButacaMapa[] = [];

    for (const butaca of base) {
      let seleccionada = false;

      if (elegidas.includes(butaca.id)) {
        seleccionada = true;
      }

      lista.push({ ...butaca, seleccionada });
    }

    return lista;
  });

  filasVisuales = computed(() => {
    const porFila: Record<string, (ButacaMapa | null)[]> = {};

    for (const letra of FILAS) {
      porFila[letra] = Array(TOTAL_COLUMNAS).fill(null);
    }

    const lista = this.butacasLista();

    for (const butaca of lista) {
      const posiciones = porFila[butaca.fila];

      if (posiciones !== undefined) {
        posiciones[butaca.columna - 1] = butaca;
      }
    }

    const filas = [];

    for (let filaIndex = 0; filaIndex < FILAS.length; filaIndex++) {
      const letra = FILAS[filaIndex];
      const esVip = FILAS_VIP.includes(letra);

      let esAccesible = false;
      let esCirculacion = false;

      if (letra === 'J') {
        esAccesible = true;
      }

      if (letra === 'K') {
        esCirculacion = true;
      }

      filas.push({
        letra,
        filaIndex,
        esVip,
        esAccesible,
        esCirculacion,
        posiciones: porFila[letra],
      });
    }

    return filas;
  });

  zoomPorcentaje(): number {
    const porcentaje = Math.round(this.zoom() * 100);

    return porcentaje;
  }

  seleccionDetalle(): ButacaMapa[] {
    const lista = this.butacasLista();
    const detalle: ButacaMapa[] = [];

    for (const id of this.seleccionInterna()) {
      const butaca = this.buscarButaca(lista, id);

      if (butaca !== undefined) {
        detalle.push(butaca);
      }
    }

    return detalle;
  }

  totalPrecio(): number {
    const precios = this.precios();
    const detalle = this.seleccionDetalle();

    let total = 0;

    for (const butaca of detalle) {
      total += this.precioDeTipo(precios, butaca.tipo);
    }

    return total;
  }

  nombreTipo(tipo: TipoButaca): string {
    let nombre = 'Común';

    if (tipo === 'vip') {
      nombre = 'VIP';
    } else if (tipo === 'accesible') {
      nombre = 'Accesible';
    }

    return nombre;
  }

  estadoTexto(estado: string, seleccionada?: boolean): string {
    let texto = 'Disponible';

    if (seleccionada === true) {
      texto = 'Seleccionada';
    } else if (estado === 'ocupada') {
      texto = 'Ocupada';
    } else if (estado === 'bloqueada') {
      texto = 'En selección';
    }

    return texto;
  }

  cambiarVista(nueva: '2d' | '3d'): void {
    if (nueva === '3d' && this.soporta === false) {
      this.mostrarNotificacion('3D no disponible en este navegador');
    } else {
      this.vista.set(nueva);
      this.ocultarTooltip();

      if (nueva === '2d') {
        this.ajustarZoom();
      } else {
        // Espero a que el contenedor deje de estar oculto para que el canvas tome su tamaño.
        setTimeout(() => this.redimensionarSala3d(), 50);
      }
    }
  }

  acercarZoom(): void {
    const actual = this.zoom();
    const redondeado = Math.round((actual + 0.1) * 10) / 10;
    const nuevo = Math.min(1.8, redondeado);

    this.zoom.set(nuevo);
  }

  alejarZoom(): void {
    const actual = this.zoom();
    const redondeado = Math.round((actual - 0.1) * 10) / 10;
    const nuevo = Math.max(0.4, redondeado);

    this.zoom.set(nuevo);
  }

  ajustarZoom(): void {
    this.zoom.set(1);
  }

  cambiarCamara(camara: string): void {
    this.camaraActiva.set(camara);

    const sala = this.sala3d();

    if (sala !== undefined) {
      sala.preset(camara);
    }
  }

  // "Desde mi butaca" del dock: la cámara va a la última butaca que se eligió.
  // El botón viene deshabilitado sin selección; el if es por si se llama igual.
  verDesdeUltima(): void {
    const elegidas = this.seleccionInterna();

    if (elegidas.length !== 0) {
      const sala = this.sala3d();

      if (sala !== undefined) {
        sala.verDesdeButaca(elegidas[elegidas.length - 1]);
      }
    }
  }

  alternarModoFuncion(): void {
    const activo = !this.modoFuncion();
    const mensaje = activo ? 'Modo función: se apagan las luces…' : 'Luces de sala encendidas';

    this.modoFuncion.set(activo);
    this.mostrarNotificacion(mensaje);
  }

  tocarButaca(butaca: ButacaMapa, evento?: MouseEvent): void {
    const actuales = this.seleccionInterna();
    const yaElegida = actuales.includes(butaca.id);

    if (this.modo() === 'ver') {
      this.mostrarTooltip(butaca, evento);
    } else if (butaca.estado === 'ocupada') {
      this.mostrarNotificacion(`La butaca ${butaca.id} ya está ocupada`);
    } else if (butaca.estado === 'bloqueada') {
      this.mostrarNotificacion(`Otra persona está eligiendo la butaca ${butaca.id}`);
    } else if (butaca.estado !== 'disponible') {
      this.mostrarNotificacion(`La butaca ${butaca.id} no está disponible`);
    } else if (yaElegida === false && actuales.length >= 10) {
      this.mostrarNotificacion('Podés elegir hasta 10 butacas por compra');
    } else {
      let nuevas: string[];

      if (yaElegida) {
        nuevas = this.sinButaca(actuales, butaca.id);
      } else {
        nuevas = [...actuales, butaca.id];
      }

      this.seleccionInterna.set(nuevas);
      this.seleccionCambiada.emit(nuevas);
      this.butacaTocada.emit(butaca);
    }
  }

  quitarButaca(id: string): void {
    const actuales = this.seleccionInterna();
    const nuevas = this.sinButaca(actuales, id);

    this.seleccionInterna.set(nuevas);
    this.seleccionCambiada.emit(nuevas);
  }

  onHover3D(evento: { butaca: ButacaMapa | null; x: number; y: number }): void {
    if (evento.butaca !== null) {
      this.tooltipData.set({ butaca: evento.butaca, x: evento.x, y: evento.y });
    } else {
      this.ocultarTooltip();
    }
  }

  mostrarTooltip(butaca: ButacaMapa, evento?: MouseEvent): void {
    let x = 200;
    let y = 200;

    if (evento !== undefined) {
      x = evento.clientX + 10;
      y = evento.clientY + 10;
    }

    this.tooltipData.set({ butaca, x, y });
  }

  ocultarTooltip(): void {
    this.tooltipData.set(null);
  }

  mostrarNotificacion(mensaje: string): void {
    this.mensajeNotificacion.set(mensaje);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.ocultarNotificacion(), 2800);
  }

  emitirContinuar(): void {
    const seleccion = this.seleccionInterna();

    if (seleccion.length > 0) {
      this.continuar.emit(seleccion);
    }
  }

  // El precio de una butaca para el chip del resumen. Los precios ya vienen con
  // la tarifa y el adicional sumados en el input precios(), que lo arma quien
  // usa el mapa.
  precioDe(butaca: ButacaMapa): number {
    const precio = this.precioDeTipo(this.precios(), butaca.tipo);

    return precio;
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
    const direccion = direcciones[event.key];

    if (direccion !== undefined) {
      event.preventDefault();

      const filas = this.filasVisuales();

      let fila = filaIndex + direccion[0];
      let columna = colIndex + direccion[1];
      let encontrada = false;

      while (
        encontrada === false &&
        fila >= 0 &&
        fila < filas.length &&
        columna >= 0 &&
        columna < TOTAL_COLUMNAS
      ) {
        const butaca = filas[fila].posiciones[columna];

        if (butaca !== null) {
          this.enfocarButaca(butaca.id);
          encontrada = true;
        } else {
          fila += direccion[0];
          columna += direccion[1];
        }
      }
    }
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────

  private buscarButaca(lista: ButacaMapa[], id: string): ButacaMapa | undefined {
    let encontrada: ButacaMapa | undefined;

    for (const butaca of lista) {
      if (encontrada === undefined && butaca.id === id) {
        encontrada = butaca;
      }
    }

    return encontrada;
  }

  private soltarOcupadas(recibidas: ButacaMapa[] | null): void {
    const actuales = this.seleccionInterna();

    if (recibidas !== null && actuales.length !== 0) {
      const vendidas: string[] = [];
      const restantes: string[] = [];

      for (const id of actuales) {
        const butaca = this.buscarButaca(recibidas, id);

        if (butaca !== undefined && butaca.estado === 'ocupada') {
          vendidas.push(id);
        } else {
          restantes.push(id);
        }
      }

      if (vendidas.length !== 0) {
        const mensaje = mensajeVendidas(vendidas);

        this.seleccionInterna.set(restantes);
        this.seleccionCambiada.emit(restantes);
        this.mostrarNotificacion(mensaje);
      }
    }
  }

  private precioDeTipo(precios: Record<string, number>, tipo: TipoButaca): number {
    let precio = 8500;

    const configurado = precios[tipo];

    if (configurado !== undefined && configurado !== 0) {
      precio = configurado;
    }

    return precio;
  }

  private sinButaca(ids: string[], id: string): string[] {
    const restantes: string[] = [];

    for (const actual of ids) {
      if (actual !== id) {
        restantes.push(actual);
      }
    }

    return restantes;
  }

  private redimensionarSala3d(): void {
    const sala = this.sala3d();

    if (sala !== undefined) {
      sala.onResize();
    }
  }

  private ocultarNotificacion(): void {
    this.mensajeNotificacion.set(null);
  }

  private enfocarButaca(id: string): void {
    const selector = `button[data-id="${id}"]`;
    const boton = document.querySelector<HTMLButtonElement>(selector);

    if (boton !== null) {
      boton.focus();
    }
  }
}

// ─── Auxiliares del módulo ──────────────────────────────────────────

// "La butaca G9 acaba de ser vendida" (AC-07.05.01), en plural si fueron varias.
function mensajeVendidas(ids: string[]): string {
  let mensaje = `La butaca ${ids[0]} acaba de ser vendida`;

  if (ids.length > 1) {
    const lista = ids.join(', ');

    mensaje = `Las butacas ${lista} acaban de ser vendidas`;
  }

  return mensaje;
}
