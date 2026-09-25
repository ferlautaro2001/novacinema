import { Component, input, OnChanges, output, signal } from '@angular/core';

// Un botón por horario ("14:00", "20:30"). Los horarios los decide quien lo usa.
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
    // Si cambian los horarios (otro día, por ejemplo) y la hora elegida ya no está,
    // la desmarco.
    const elegida = this.elegida();

    if (elegida !== null && this.horarios().includes(elegida) === false) {
      this.elegida.set(null);
    }
  }

  elegir(hora: string): void {
    this.elegida.set(hora);
    this.horaElegida.emit(hora);
  }
}
