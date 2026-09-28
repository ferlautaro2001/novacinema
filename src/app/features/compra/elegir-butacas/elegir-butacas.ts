import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuncionesService } from '../../../core/data/funciones-service';
import { PreciosService } from '../../../core/data/precios-service';
import type { FuncionParaComprar } from '../../../core/models/funcion';
import { CargaConsulta } from '../../../shared/ui/carga-consulta/carga-consulta';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';
import { MapaButacasComponent } from '../../../shared/ui/mapa-butacas/mapa-butacas';
import {
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
type EstadoPantalla = 'cargando' | 'listo' | 'error';

@Component({
  selector: 'nc-elegir-butacas',
  imports: [CurrencyPipe, DatePipe, RouterLink, CargaConsulta, FocoInicial, MapaButacasComponent, Modal],
  templateUrl: './elegir-butacas.html',
  styleUrl: './elegir-butacas.css',
})
export class ElegirButacas implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService);
  private preciosService = inject(PreciosService);
  private compra = inject(CompraEstado);

  private mapa = viewChild(MapaButacasComponent);

  estado = signal<EstadoPantalla>('cargando');
  funcion = signal<FuncionParaComprar | null>(null);
  mensaje = signal('');
  butacasMapa = signal<ButacaMapa[]>([]);
  precios = signal<Record<string, number>>({ comun: 0, vip: 0, accesible: 0 });
  resumen = signal<ButacaElegida[]>([]);
  total = signal(0);
  confirmarAbierto = signal(false);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('funcionId');

    if (id !== null && id !== '') {
      await this.cargarFuncion(id);
    } else {
      this.funcion.set(null);
      this.estado.set('listo');
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

  // Reservar guarda la selección y sigue con los descuentos (US-07.06).
  reservar(): void {
    const funcion = this.funcion();
    const resumen = this.resumen();

    if (funcion !== null && resumen.length !== 0) {
      const ids: string[] = [];

      for (const elegida of resumen) {
        ids.push(elegida.id);
      }

      this.compra.guardarSeleccion(funcion, ids);
      this.router.navigate(['/comprar', funcion.id, 'descuentos']);
    }
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

    // Las bloqueadas ("En selección") las alimenta el Broadcast de US-07.05.
    // Hasta entonces van vacías: la leyenda igual las muestra.
    const distribucion = generarDistribucionSala(ocupadas, []);

    this.butacasMapa.set(distribucion.butacas);
    this.estado.set('listo');
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
