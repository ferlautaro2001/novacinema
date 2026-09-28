import { Component, input, output } from '@angular/core';

// El control de cantidad de un producto del pedido (US-08.04). No guarda nada:
// muestra la cantidad que recibe y avisa con sumar y restar, así la misma pieza
// sirve en la card del menú y en la lista del pedido.
@Component({
  selector: 'nc-cantidad',
  templateUrl: './cantidad.html',
  styleUrl: './cantidad.css',
})
export class Cantidad {
  cantidad = input.required<number>();
  // Para los textos de lectura: "Sumar Pretzel".
  producto = input.required<string>();

  sumar = output<void>();
  restar = output<void>();
}
