import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'textoLargo' })
export class TextoLargoPipe implements PipeTransform {
  transform(texto: string, limite = 80): string {
    if (texto.length > limite) {
      return texto.slice(0, Math.max(0, limite - 1)) + '…';
    }
    return texto;
  }
}
