import { Component, input } from '@angular/core';

// La edad mínima la recibo por input para no depender del modelo de core.
@Component({
  selector: 'nc-clasificacion',
  templateUrl: './clasificacion.html',
  styleUrl: './clasificacion.css',
})
export class Clasificacion {
  codigo = input.required<'ATP' | '+13' | '+16' | '+18'>();
  edadMinima = input.required<number>();
}
