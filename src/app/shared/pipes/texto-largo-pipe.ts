import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'textoLargo' })
export class TextoLargoPipe implements PipeTransform {
  transform(texto: string, limite = 80): string {
    const caracteres = Array.from(texto);
    return caracteres.length > limite
      ? caracteres.slice(0, Math.max(0, limite - 1)).join('') + '…'
      : texto;
  }
}
