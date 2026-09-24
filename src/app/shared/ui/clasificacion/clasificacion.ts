import { Component, input } from '@angular/core';

// Distintivo de la clasificación por edad. La edad mínima llega por input (sale de
// la tabla clasificaciones), así el componente no depende del modelo de core.
@Component({
  selector: 'nc-clasificacion',
  templateUrl: './clasificacion.html',
  styleUrl: './clasificacion.css',
})
export class Clasificacion {
  codigo = input.required<'ATP' | '+13' | '+16' | '+18'>();
  edadMinima = input.required<number>();
}
