import { Service, signal } from '@angular/core';
import type { CompraRegistrada } from '../../core/data/compras-service';
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
// entradas, si hizo falta el adulto responsable, el descuento que se aplicó y,
// al final, cómo quedó pagada.
// Vive en un servicio y no en la URL porque ninguno de esos datos es parte de
// la dirección de una pantalla.
@Service()
export class CompraEstado {
  funcion = signal<FuncionParaComprar | null>(null);
  entradas = signal<EntradaElegida[]>([]);
  adulto = signal<DatosAdulto | null>(null);
  descuento = signal<DescuentoElegido | null>(null);
  confirmada = signal<CompraRegistrada | null>(null);
  // A nombre de quién quedó la entrada: el adulto responsable si lo hubo
  // (AC-07.03.02), si no quien compró. Va en el PDF (US-07.08).
  titular = signal('');

  // Una selección nueva descarta el descuento anterior: se calculó sobre otro
  // subtotal.
  guardarSeleccion(funcion: FuncionParaComprar, entradas: EntradaElegida[]): void {
    this.funcion.set(funcion);
    this.entradas.set(entradas);
    this.descuento.set(null);
    this.confirmada.set(null);
  }

  guardarAdulto(adulto: DatosAdulto): void {
    this.adulto.set(adulto);
  }

  guardarDescuento(descuento: DescuentoElegido | null): void {
    this.descuento.set(descuento);
  }

  // La compra ya está pagada: se guarda para la confirmación, con su titular, y
  // se olvida el adulto, que era de esta compra.
  confirmar(registrada: CompraRegistrada, titular: string): void {
    this.confirmada.set(registrada);
    this.titular.set(titular);
    this.adulto.set(null);
  }

  limpiar(): void {
    this.funcion.set(null);
    this.entradas.set([]);
    this.adulto.set(null);
    this.descuento.set(null);
    this.confirmada.set(null);
    this.titular.set('');
  }
}
