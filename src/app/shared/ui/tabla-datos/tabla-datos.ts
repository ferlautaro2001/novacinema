import { Component, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'nc-tabla-datos',
  imports: [NgTemplateOutlet],
  template: `<div class="contenedor">
    <table>
      <caption class="solo-lector">
        {{
          titulo()
        }}
      </caption>
      <thead>
        <ng-content select="[encabezado]" />
      </thead>
      <tbody>
        @for (fila of filas(); track fila.id) {
          <tr>
            <ng-container
              [ngTemplateOutlet]="plantillaFila()"
              [ngTemplateOutletContext]="{ $implicit: fila }"
            />
          </tr>
        } @empty {
          <tr>
            <td>No hay datos.</td>
          </tr>
        }
      </tbody>
    </table>
  </div>`,
  styles: `
    .contenedor {
      position: relative;
      overflow-x: auto;
      border: 1px solid var(--border-100);
      border-radius: var(--radius-lg);
      background: var(--surface-200);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
  `,
})
export class TablaDatos<T extends { id: string | number }> {
  readonly filas = input.required<T[]>();
  readonly plantillaFila = input.required<TemplateRef<{ $implicit: T }>>();
  readonly titulo = input('Listado');
}
