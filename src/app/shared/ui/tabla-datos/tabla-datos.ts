import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'nc-tabla-datos',
  imports: [NgTemplateOutlet],
  templateUrl: './tabla-datos.html',
  styleUrl: './tabla-datos.css',
})
export class TablaDatos<T extends { id: string | number }> {
  readonly filas = input.required<T[]>();
  readonly plantillaFila = input.required<TemplateRef<{ $implicit: T }>>();
  readonly titulo = input('Listado');
}
