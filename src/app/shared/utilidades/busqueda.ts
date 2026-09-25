// Búsqueda de películas por nombre (US-06.04).

// true si el título contiene el texto, sin distinguir mayúsculas ni tildes.
// Un texto vacío coincide con todo.
export function coincideTitulo(titulo: string, texto: string): boolean {
  let coincide = false;

  const buscado = normalizar(texto);
  const tituloNormalizado = normalizar(titulo);

  if (buscado === '') {
    coincide = true;
  } else if (tituloNormalizado.includes(buscado)) {
    coincide = true;
  }

  return coincide;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Saco mayúsculas y tildes para que "pequeno" encuentre a "Pequeño".
function normalizar(texto: string): string {
  const normalizado = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  return normalizado;
}
