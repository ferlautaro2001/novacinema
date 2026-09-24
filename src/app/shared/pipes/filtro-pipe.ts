import { Pipe, PipeTransform } from '@angular/core';

// Sin mayúsculas ni tildes: "perez" encuentra a "Pérez".
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Filtra una lista por texto en los campos indicados (patrón filter-pipe de la
// cursada). Con el texto vacío devuelve la lista entera.
//   usuarios | filtro: busqueda : ['email', 'apellido']
@Pipe({ name: 'filtro' })
export class FiltroPipe implements PipeTransform {
  transform<T>(items: T[] | null, texto: string, campos: (keyof T)[]): T[] {
    if (!items) return [];
    const buscado = normalizar(texto ?? '');
    if (!buscado) return [...items];
    return items.filter((item) =>
      campos.some((campo) => normalizar(String(item[campo] ?? '')).includes(buscado)),
    );
  }
}
