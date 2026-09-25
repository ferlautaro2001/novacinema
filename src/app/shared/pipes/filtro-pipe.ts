import { Pipe, PipeTransform } from '@angular/core';

// Saco mayúsculas y tildes para que "perez" encuentre a "Pérez".
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Uso: usuarios | filtro: busqueda : ['email', 'apellido']
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
