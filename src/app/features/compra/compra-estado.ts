import { Service, signal } from '@angular/core';
import type { FuncionParaComprar } from '../../core/models/funcion';
import type { DescuentoElegido } from '../../core/reglas/descuentos';
import type { TipoButaca } from '../../shared/ui/mapa-butacas/distribucion';
import type { DatosAdulto } from './adulto-responsable/adulto-responsable';

// Una butaca elegida con su precio ya calculado, para el modal y los pasos que
// siguen. El precio se congela acá: si la tarifa cambia a mitad de la compra,
// se cobra lo que se vio al elegir.
export interface EntradaElegida {
  id: string;
  tipo: TipoButaca;
  nombre: string;
  precio: number;
}

// Lo que la compra lleva de una pantalla a la otra: la función elegida, las
// entradas, si hizo falta el adulto responsable y el descuento que se aplicó.
// Vive en un servicio y no en la URL porque ninguno de esos datos es parte de
// la dirección de una pantalla.
@Service()
export class CompraEstado {
  funcion = signal<FuncionParaComprar | null>(null);
  entradas = signal<EntradaElegida[]>([]);
  adulto = signal<DatosAdulto | null>(null);
  descuento = signal<DescuentoElegido | null>(null);

  // Una selección nueva descarta el descuento anterior: se calculó sobre otro
  // subtotal.
  guardarSeleccion(funcion: FuncionParaComprar, entradas: EntradaElegida[]): void {
    this.funcion.set(funcion);
    this.entradas.set(entradas);
    this.descuento.set(null);
  }

  guardarAdulto(adulto: DatosAdulto): void {
    this.adulto.set(adulto);
  }

  guardarDescuento(descuento: DescuentoElegido | null): void {
    this.descuento.set(descuento);
  }

  limpiar(): void {
    this.funcion.set(null);
    this.entradas.set([]);
    this.adulto.set(null);
    this.descuento.set(null);
  }
}
