import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'nc-tabla-datos',
  imports: [NgTemplateOutlet],
  templateUrl: './tabla-datos.html',
  styleUrl: './tabla-datos.css',
})
export class TablaDatos<T extends { id: string | number }> {
  filas = input.required<T[]>();
  plantillaFila = input.required<TemplateRef<{ $implicit: T }>>();
  titulo = input('Listado');
}
