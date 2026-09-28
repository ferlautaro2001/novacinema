import { Component, input, OnChanges, output, signal } from '@angular/core';

// Una opción del selector de horarios. El id es el de la función, así que dos
// funciones con la misma hora y formato no se confunden.
export interface OpcionHora {
  id: string;
  // Lo que se ve: "21:00 · 2D · Castellano".
  etiqueta: string;
  // Sin butacas libres: se muestra, pero no se puede tocar (AC-07.01.02).
  agotada: boolean;
}

// Un botón por horario ("14:00", "20:30"). Las opciones las arma quien lo usa.
@Component({
  selector: 'nc-selector-hora',
  templateUrl: './selector-hora.html',
  styleUrl: './selector-hora.css',
})
export class SelectorHora implements OnChanges {
  opciones = input.required<OpcionHora[]>();
  horaElegida = output<OpcionHora>();

  elegida = signal<string | null>(null);

  ngOnChanges(): void {
    // Si cambian las opciones (otro día, por ejemplo) y la elegida ya no está,
    // la desmarco.
    const elegida = this.elegida();

    if (elegida !== null) {
      const sigueEstando = hayOpcionConId(this.opciones(), elegida);

      if (sigueEstando === false) {
        this.elegida.set(null);
      }
    }
  }

  elegir(opcion: OpcionHora): void {
    if (opcion.agotada) {
      return;
    }

    this.elegida.set(opcion.id);
    this.horaElegida.emit(opcion);
  }

  estaElegida(opcion: OpcionHora): boolean {
    const elegida = this.elegida();

    let bandera = false;

    if (elegida !== null && elegida === opcion.id) {
      bandera = true;
    }

    return bandera;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function hayOpcionConId(opciones: OpcionHora[], id: string): boolean {
  let esta = false;

  for (const opcion of opciones) {
    if (opcion.id === id) {
      esta = true;
    }
  }

  return esta;
}
