import { Service, signal } from '@angular/core';
import type { FuncionParaComprar } from '../../core/models/funcion';
import type { DatosAdulto } from './adulto-responsable/adulto-responsable';

// Lo que la compra lleva de una pantalla a la otra: la función elegida, las
// butacas y, si hizo falta, el adulto responsable. Vive en un servicio y no en
// la URL porque ninguno de esos datos es parte de la dirección de una pantalla.
@Service()
export class CompraEstado {
  funcion = signal<FuncionParaComprar | null>(null);
  butacas = signal<string[]>([]);
  adulto = signal<DatosAdulto | null>(null);

  guardarSeleccion(funcion: FuncionParaComprar, butacas: string[]): void {
    this.funcion.set(funcion);
    this.butacas.set(butacas);
  }

  guardarAdulto(adulto: DatosAdulto): void {
    this.adulto.set(adulto);
  }

  limpiar(): void {
    this.funcion.set(null);
    this.butacas.set([]);
    this.adulto.set(null);
  }
}
