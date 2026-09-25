import { Pipe, PipeTransform } from '@angular/core';

// Uso: usuarios | filtro: busqueda : ['email', 'apellido']
@Pipe({ name: 'filtro' })
export class FiltroPipe implements PipeTransform {
  transform<T>(items: T[] | null, texto: string, campos: (keyof T)[]): T[] {
    let encontrados: T[] = [];

    if (items !== null && items !== undefined) {
      let textoBuscado = '';

      if (texto !== null && texto !== undefined) {
        textoBuscado = texto;
      }

      const buscado = normalizar(textoBuscado);

      if (buscado === '') {
        encontrados = [...items];
      } else {
        for (const item of items) {
          if (coincideAlgunCampo(item, campos, buscado)) {
            encontrados.push(item);
          }
        }
      }
    }

    return encontrados;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Saco mayúsculas y tildes para que "perez" encuentre a "Pérez".
function normalizar(texto: string): string {
  const normalizado = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  return normalizado;
}

function coincideAlgunCampo<T>(item: T, campos: (keyof T)[], buscado: string): boolean {
  let coincide = false;

  for (const campo of campos) {
    const valor = item[campo];

    let valorTexto = '';

    if (valor !== null && valor !== undefined) {
      valorTexto = String(valor);
    }

    const valorNormalizado = normalizar(valorTexto);

    if (valorNormalizado.includes(buscado)) {
      coincide = true;
      break;
    }
  }

  return coincide;
}
