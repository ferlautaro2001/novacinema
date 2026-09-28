import { Component, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { FuncionesService } from '../../../core/data/funciones-service';
import { PreciosService } from '../../../core/data/precios-service';
import type { FuncionParaComprar } from '../../../core/models/funcion';
import { butacasYaVendidas, mensajeNoDisponibles } from '../../../core/reglas/butacas';
import { RealtimeButacas, type MensajeSeleccion } from '../../../core/supabase/realtime-butacas';
import { CargaConsulta } from '../../../shared/ui/carga-consulta/carga-consulta';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';
import { MapaButacasComponent } from '../../../shared/ui/mapa-butacas/mapa-butacas';
import {
  aplicarEstados,
  generarDistribucionSala,
  type ButacaMapa,
  type TipoButaca,
} from '../../../shared/ui/mapa-butacas/distribucion';
import { Modal } from '../../../shared/ui/modal/modal';
import { CompraEstado } from '../compra-estado';

// Los ids de tipo_butaca de la base: 1 es común y 2 es VIP. La accesible paga
// como común, que es lo que dice reglas/precios.
const TIPO_COMUN = 1;
const TIPO_VIP = 2;

// Una butaca elegida con su precio ya calculado, para el modal y los pasos que
// siguen. El precio se congela acá: si la tarifa cambia a mitad de la compra,
// se cobra lo que se vio al elegir.
interface ButacaElegida {
  id: string;
  tipo: TipoButaca;
  nombre: string;
  precio: number;
}

// El segundo paso de la compra: elegir butacas en el mapa (US-07.04).
//
// El mapa trae la selección, el tope de 10 y el panel con el total. Esta
// pantalla le suma lo que solo ella sabe: qué función es, qué butacas están
// ocupadas, cuánto sale cada tipo y la confirmación antes de seguir.
//
// Mientras está abierta escucha el canal de la función (US-07.05): las ventas
// ajenas ocupan butacas y lo que eligen los demás aparece "En selección".
type EstadoPantalla = 'cargando' | 'listo' | 'error';

@Component({
  selector: 'nc-elegir-butacas',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    CargaConsulta,
    FocoInicial,
    MapaButacasComponent,
    Modal,
  ],
  templateUrl: './elegir-butacas.html',
  styleUrl: './elegir-butacas.css',
  // Al cerrar la pestaña no llega a correr ngOnDestroy: se sueltan las butacas acá.
  host: { '(window:pagehide)': 'liberarPropias()' },
})
export class ElegirButacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService);
  private preciosService = inject(PreciosService);
  private compra = inject(CompraEstado);
  private realtime = inject(RealtimeButacas);

  private mapa = viewChild(MapaButacasComponent);

  estado = signal<EstadoPantalla>('cargando');
  funcion = signal<FuncionParaComprar | null>(null);
  mensaje = signal('');
  butacasMapa = signal<ButacaMapa[]>([]);
  precios = signal<Record<string, number>>({ comun: 0, vip: 0, accesible: 0 });
  resumen = signal<ButacaElegida[]>([]);
  total = signal(0);
  confirmarAbierto = signal(false);
  aviso = signal('');

  // Lo que llega por el canal. Las ocupadas son ids del mapa; las ajenas, lo que
  // eligió cada otra pestaña, por su id de cliente.
  private ocupadas = signal<string[]>([]);
  private ajenas = signal<Record<string, string[]>>({});

  private canal: RealtimeChannel | null = null;
  private cliente = crypto.randomUUID();
  // Lo último que se publicó como propio, para mandar solo la diferencia.
  private propias: string[] = [];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('funcionId');

    if (id !== null && id !== '') {
      await this.cargarFuncion(id);
    } else {
      this.funcion.set(null);
      this.estado.set('listo');
    }
  }

  ngOnDestroy(): void {
    const canal = this.canal;

    if (canal !== null) {
      this.liberarPropias();
      this.canal = null;
      this.realtime.desconectar(canal);
    }
  }

  // El mapa avisa con Continuar: se arma el resumen desde su selección y se abre
  // la confirmación. Se lee del mapa y no de una copia local para no tener dos
  // selecciones que se puedan desincronizar.
  confirmar(): void {
    const mapa = this.mapa();

    if (mapa !== undefined) {
      const detalle = mapa.seleccionDetalle();
      const lista: ButacaElegida[] = [];

      let total = 0;

      for (const butaca of detalle) {
        const precio = mapa.precioDe(butaca);
        const elegida: ButacaElegida = {
          id: butaca.id,
          tipo: butaca.tipo,
          nombre: nombreDeTipoButaca(butaca.tipo),
          precio: precio,
        };

        lista.push(elegida);
        total = total + precio;
      }

      this.resumen.set(lista);
      this.total.set(total);
      this.confirmarAbierto.set(true);
    }
  }

  volver(): void {
    this.confirmarAbierto.set(false);
  }

  // Reservar guarda la selección y sigue con los descuentos (US-07.06). Antes se
  // vuelve a mirar la ocupación: si una butaca se vendió entre el último aviso y
  // este click, no se sigue (AC-07.05.03).
  async reservar(): Promise<void> {
    const funcion = this.funcion();
    const resumen = this.resumen();

    if (funcion !== null && resumen.length !== 0) {
      const ids: string[] = [];

      for (const elegida of resumen) {
        ids.push(elegida.id);
      }

      try {
        const ocupadas = await this.funcionesService.butacasOcupadas(funcion.id);

        this.revisarYSeguir(funcion, ids, ocupadas);
      } catch {
        this.confirmarAbierto.set(false);
        this.aviso.set('No se pudo revisar si las butacas siguen libres. Probá de nuevo.');
      }
    }
  }

  // El mapa avisa cada cambio de selección, también cuando saca una butaca que
  // se vendió. Se publica solo lo que cambió: SELECCIONAR lo nuevo y LIBERAR lo
  // que se soltó.
  alCambiarSeleccion(nuevas: string[]): void {
    const agregadas = diferencia(nuevas, this.propias);
    const quitadas = diferencia(this.propias, nuevas);

    this.propias = nuevas;
    this.publicar('SELECCIONAR', agregadas);
    this.publicar('LIBERAR', quitadas);

    if (agregadas.length !== 0) {
      this.aviso.set('');
    }
  }

  // Suelta todo lo propio: al irse de la pantalla o al cerrar la pestaña.
  liberarPropias(): void {
    const propias = this.propias;

    this.propias = [];
    this.publicar('LIBERAR', propias);
  }

  // El precio de un tipo para el tooltip. Sale del mismo mapa de precios que se
  // le pasa al mapa, así el tooltip y los chips muestran lo mismo.
  precioDeTipo(tipo: TipoButaca): number {
    const precio = this.precios()[tipo];

    return precio;
  }

  nombreDeTipo(tipo: TipoButaca): string {
    const nombre = nombreDeTipoButaca(tipo);

    return nombre;
  }

  private async cargarFuncion(id: string): Promise<void> {
    this.estado.set('cargando');

    try {
      const funcion = await this.funcionesService.buscarParaComprar(id);

      if (funcion === null) {
        this.funcion.set(null);
        this.estado.set('listo');
      } else {
        await this.cargarMapa(funcion);
      }
    } catch {
      this.estado.set('error');
      this.mensaje.set('No se pudo cargar la función elegida. Probá de nuevo.');
    }
  }

  private async cargarMapa(funcion: FuncionParaComprar): Promise<void> {
    const ocupadas = await this.funcionesService.butacasOcupadas(funcion.id);
    const tarifas = await this.preciosService.tarifasVigentes();
    const adicionales = await this.preciosService.adicionalesVigentes();

    const comun = valorDe(tarifas, TIPO_COMUN);
    const vip = valorDe(tarifas, TIPO_VIP);
    const adicional = valorDe(adicionales, funcion.formatoId);

    this.funcion.set(funcion);
    this.precios.set({
      comun: comun + adicional,
      vip: vip + adicional,
      accesible: comun + adicional,
    });

    // Las bloqueadas ("En selección") arrancan vacías: las trae el canal.
    const distribucion = generarDistribucionSala(ocupadas, []);

    this.ocupadas.set(ocupadas);
    this.butacasMapa.set(distribucion.butacas);
    this.estado.set('listo');
    this.escucharCanal(funcion.id);
  }

  private revisarYSeguir(funcion: FuncionParaComprar, ids: string[], ocupadas: string[]): void {
    const vendidas = butacasYaVendidas(ids, ocupadas);

    if (vendidas.length === 0) {
      this.compra.guardarSeleccion(funcion, ids);
      this.router.navigate(['/comprar', funcion.id, 'descuentos']);
    } else {
      const mensaje = mensajeNoDisponibles(vendidas);

      this.confirmarAbierto.set(false);
      this.ocupadas.set(ocupadas);
      this.repintar();
      this.aviso.set(mensaje);
    }
  }

  private escucharCanal(funcionId: string): void {
    this.canal = this.realtime.conectar(funcionId, this.cliente, {
      alCambiarOcupacion: () => this.releerOcupadas(funcionId),
      alSeleccionar: (mensaje) => this.alSeleccionarAjena(mensaje),
      alLiberar: (mensaje) => this.alLiberarAjena(mensaje),
      alIrse: (cliente) => this.alIrseAjena(cliente),
      alConectar: () => this.presentarse(),
    });
  }

  // El aviso de la base solo dice que algo cambió: se leen de nuevo las ocupadas.
  // Si falla, el mapa se queda como estaba y lo cubre la revisión al reservar.
  private async releerOcupadas(funcionId: string): Promise<void> {
    try {
      const ocupadas = await this.funcionesService.butacasOcupadas(funcionId);

      this.ocupadas.set(ocupadas);
      this.repintar();
    } catch {
      // Se ignora a propósito: ver arriba.
    }
  }

  // Al conectarse (y al reconectarse) la pestaña anuncia lo suyo. Las demás, al
  // ver un cliente nuevo, le contestan con lo que tienen elegido; así quien entra
  // tarde también ve lo que ya estaba "En selección".
  private presentarse(): void {
    const canal = this.canal;

    if (canal !== null) {
      this.realtime.seleccionar(canal, { cliente: this.cliente, butacas: this.propias });
    }
  }

  private alSeleccionarAjena(mensaje: MensajeSeleccion): void {
    const previas = this.ajenas()[mensaje.cliente];

    let esNuevo = false;

    if (previas === undefined) {
      esNuevo = true;
    }

    if (mensaje.cliente !== '') {
      this.ajenas.update((ajenas) => conButacas(ajenas, mensaje));
      this.repintar();

      if (esNuevo && this.propias.length !== 0) {
        this.presentarse();
      }
    }
  }

  private alLiberarAjena(mensaje: MensajeSeleccion): void {
    this.ajenas.update((ajenas) => sinButacas(ajenas, mensaje));
    this.repintar();
  }

  // Una pestaña que se cerró sin avisar: se suelta todo lo que tenía.
  private alIrseAjena(cliente: string): void {
    this.ajenas.update((ajenas) => sinCliente(ajenas, cliente));
    this.repintar();
  }

  // Cada cambio arma un array nuevo con update(): el mapa lo recibe por input y la
  // escena 3D lo toma en ngOnChanges.
  private repintar(): void {
    const ocupadas = this.ocupadas();
    const bloqueadas = todasLasAjenas(this.ajenas());

    this.butacasMapa.update((actuales) => aplicarEstados(actuales, ocupadas, bloqueadas));
  }

  private publicar(evento: 'SELECCIONAR' | 'LIBERAR', butacas: string[]): void {
    const canal = this.canal;

    if (canal !== null && butacas.length !== 0) {
      const mensaje: MensajeSeleccion = { cliente: this.cliente, butacas };

      if (evento === 'SELECCIONAR') {
        this.realtime.seleccionar(canal, mensaje);
      } else {
        this.realtime.liberar(canal, mensaje);
      }
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Lee un mapa de precios con valor por defecto. Sin el id no hay precio, y una
// butaca sin precio no se puede cobrar: se toma cero para que el total no
// esconda nada.
function valorDe(valores: Map<number, number>, id: number): number {
  let valor = 0;
  const encontrado = valores.get(id);

  if (encontrado !== undefined) {
    valor = encontrado;
  }

  return valor;
}

// El nombre del tipo como lo pide AC-07.04.02: "Común", "VIP" y "Accesible".
// Es el mismo que muestra el mapa; se repite acá porque el tooltip y el modal
// son de esta pantalla y el método del mapa no se puede importar.
function nombreDeTipoButaca(tipo: TipoButaca): string {
  let nombre = 'Común';

  if (tipo === 'vip') {
    nombre = 'VIP';
  } else if (tipo === 'accesible') {
    nombre = 'Accesible';
  }

  return nombre;
}

// Los ids de la primera lista que no están en la segunda.
function diferencia(ids: string[], otros: string[]): string[] {
  const faltantes: string[] = [];

  for (const id of ids) {
    if (otros.includes(id) === false) {
      faltantes.push(id);
    }
  }

  return faltantes;
}

// Una copia de las selecciones ajenas con las butacas del mensaje sumadas a las
// que ya tenía ese cliente.
function conButacas(
  ajenas: Record<string, string[]>,
  mensaje: MensajeSeleccion,
): Record<string, string[]> {
  const copia = { ...ajenas };

  let previas: string[] = [];

  if (copia[mensaje.cliente] !== undefined) {
    previas = copia[mensaje.cliente];
  }

  const nuevas = diferencia(mensaje.butacas, previas);

  copia[mensaje.cliente] = [...previas, ...nuevas];

  return copia;
}

// Una copia de las selecciones ajenas sin las butacas del mensaje. Un cliente
// que se queda sin nada se borra: si vuelve a elegir, cuenta como nuevo.
function sinButacas(
  ajenas: Record<string, string[]>,
  mensaje: MensajeSeleccion,
): Record<string, string[]> {
  const copia = { ...ajenas };
  const previas = copia[mensaje.cliente];

  if (previas !== undefined) {
    const restantes = diferencia(previas, mensaje.butacas);

    if (restantes.length === 0) {
      delete copia[mensaje.cliente];
    } else {
      copia[mensaje.cliente] = restantes;
    }
  }

  return copia;
}

// Una copia de las selecciones ajenas sin las de ese cliente.
function sinCliente(ajenas: Record<string, string[]>, cliente: string): Record<string, string[]> {
  const copia = { ...ajenas };

  delete copia[cliente];

  return copia;
}

// Todas las butacas que tienen elegidas las otras pestañas, en una sola lista.
function todasLasAjenas(ajenas: Record<string, string[]>): string[] {
  const todas: string[] = [];

  for (const cliente of Object.keys(ajenas)) {
    for (const id of ajenas[cliente]) {
      todas.push(id);
    }
  }

  return todas;
}
