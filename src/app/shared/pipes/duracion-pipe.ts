import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duracion' })
export class DuracionPipe implements PipeTransform {
  transform(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (horas > 0 && resto > 0) {
      return `${horas} h ${resto} min`;
    }
    if (horas > 0) {
      return `${horas} h`;
    }
    return `${resto} min`;
  }
}
