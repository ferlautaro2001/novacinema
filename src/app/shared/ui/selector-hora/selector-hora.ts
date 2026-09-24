import { Component, input, OnChanges, output, signal } from '@angular/core';

// Selector rápido de hora: un botón por horario disponible ("14:00", "20:30").
// Los horarios los decide quien lo usa; este componente solo los muestra.
@Component({
  selector: 'nc-selector-hora',
  templateUrl: './selector-hora.html',
  styleUrl: './selector-hora.css',
})
export class SelectorHora implements OnChanges {
  horarios = input.required<string[]>();
  horaElegida = output<string>();

  elegida = signal<string | null>(null);

  ngOnChanges(): void {
    // Si cambian los horarios (por ejemplo, otro día) y la hora elegida ya no está,
    // se desmarca para no dejar marcada una opción que no existe.
    const elegida = this.elegida();
    if (elegida !== null && !this.horarios().includes(elegida)) {
      this.elegida.set(null);
    }
  }

  elegir(hora: string): void {
    this.elegida.set(hora);
    this.horaElegida.emit(hora);
  }
}
