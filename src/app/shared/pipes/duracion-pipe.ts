import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duracion' })
export class DuracionPipe implements PipeTransform {
  transform(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    let duracion: string;

    if (horas > 0 && resto > 0) {
      duracion = `${horas} h ${resto} min`;
    } else if (horas > 0) {
      duracion = `${horas} h`;
    } else {
      duracion = `${resto} min`;
    }

    return duracion;
  }
}
