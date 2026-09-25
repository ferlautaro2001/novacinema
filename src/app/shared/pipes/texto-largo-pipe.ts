import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'textoLargo' })
export class TextoLargoPipe implements PipeTransform {
  transform(texto: string, limite = 80): string {
    let resultado = texto;

    if (texto.length > limite) {
      const largo = Math.max(0, limite - 1);
      const recortado = texto.slice(0, largo);
      resultado = `${recortado}…`;
    }

    return resultado;
  }
}
