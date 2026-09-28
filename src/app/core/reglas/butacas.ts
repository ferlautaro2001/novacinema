// La distribución de la sala está en shared/ui/mapa-butacas/distribucion.ts porque
// la usa el mapa y shared no importa de core. Acá van las reglas de butacas que no
// tienen que ver con dibujarlas.

// El código con que Postgres rechaza un insert que choca con un índice único. En
// entradas es entradas_butaca_unica_por_funcion: la butaca ya se vendió.
const CODIGO_DUPLICADO = '23505';

// Las butacas de la selección que ya figuran ocupadas, en el orden de la
// selección. Se usa al confirmar para volver a revisar antes de seguir
// (AC-07.05.03).
export function butacasYaVendidas(seleccion: string[], ocupadas: string[]): string[] {
  const vendidas: string[] = [];

  for (const id of seleccion) {
    if (ocupadas.includes(id)) {
      vendidas.push(id);
    }
  }

  return vendidas;
}

// "F11 ya no está disponible. Elegí otra butaca" (AC-07.05.03). Con varias se
// nombran todas y el texto pasa a plural.
export function mensajeNoDisponibles(ids: string[]): string {
  let mensaje = `${ids[0]} ya no está disponible. Elegí otra butaca`;

  if (ids.length > 1) {
    const lista = enumerar(ids);

    mensaje = `${lista} ya no están disponibles. Elegí otras butacas`;
  }

  return mensaje;
}

// Si el error de guardar las entradas es el del índice único, la compra perdió
// la carrera por una butaca: hay que pedir que elija otra (US-07.07 lo usa al
// pagar).
export function esButacaYaVendida(error: { code?: string } | null): boolean {
  let yaVendida = false;

  if (error !== null && error.code === CODIGO_DUPLICADO) {
    yaVendida = true;
  }

  return yaVendida;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// "F10, F11 y F12": comas entre las primeras y "y" antes de la última.
function enumerar(ids: string[]): string {
  const primeras = ids.slice(0, -1).join(', ');
  const ultima = ids[ids.length - 1];
  const texto = `${primeras} y ${ultima}`;

  return texto;
}
