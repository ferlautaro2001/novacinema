import { Component, computed, input } from '@angular/core';

interface Estrella {
  posicion: number;
  llena: boolean;
}

// Muestra de 0 a 5 estrellas (US-06.03). Lo usan la card y los comentarios del detalle.
// Los lectores de pantalla leen solo el texto "4 de 5 estrellas"; los íconos quedan ocultos.
@Component({
  selector: 'nc-estrellas',
  templateUrl: './estrellas.html',
  styleUrl: './estrellas.css',
})
export class Estrellas {
  cantidad = input.required<number>();
  estrellas = computed(() => this.calcularEstrellas());
  cantidadValida = computed(() => this.calcularCantidadValida());

  private calcularCantidadValida(): number {
    const cantidad = acotar(this.cantidad());

    return cantidad;
  }

  private calcularEstrellas(): Estrella[] {
    const estrellas: Estrella[] = [];
    const cantidad = this.cantidadValida();

    for (let posicion = 1; posicion <= 5; posicion++) {
      let llena = false;

      if (posicion <= cantidad) {
        llena = true;
      }

      const estrella: Estrella = { posicion: posicion, llena: llena };

      estrellas.push(estrella);
    }

    return estrellas;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Redondea y deja la cantidad entre 0 y 5.
function acotar(cantidad: number): number {
  let bandera = Math.round(cantidad);

  if (bandera < 0) {
    bandera = 0;
  } else if (bandera > 5) {
    bandera = 5;
  }

  return bandera;
}
