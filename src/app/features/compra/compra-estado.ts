import { Service, signal } from '@angular/core';
import type { FuncionParaComprar } from '../../core/models/funcion';

// Lo que la compra lleva de una pantalla a la otra: la función elegida y las
// butacas. Vive en un servicio y no en la URL porque la lista de butacas no es
// parte de la dirección de ninguna pantalla.
@Service()
export class CompraEstado {
  funcion = signal<FuncionParaComprar | null>(null);
  butacas = signal<string[]>([]);

  guardarSeleccion(funcion: FuncionParaComprar, butacas: string[]): void {
    this.funcion.set(funcion);
    this.butacas.set(butacas);
  }

  limpiar(): void {
    this.funcion.set(null);
    this.butacas.set([]);
  }
}
