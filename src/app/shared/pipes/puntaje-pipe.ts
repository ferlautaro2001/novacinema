import { Pipe, PipeTransform } from '@angular/core';

const formatoPuntaje = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Uso: pelicula.puntuacion | puntaje → "8,4", o "Sin calificaciones" si es null.
@Pipe({ name: 'puntaje' })
export class PuntajePipe implements PipeTransform {
  transform(puntuacion: number | null): string {
    let texto = 'Sin calificaciones';

    if (puntuacion !== null) {
      texto = formatoPuntaje.format(puntuacion);
    }

    return texto;
  }
}
