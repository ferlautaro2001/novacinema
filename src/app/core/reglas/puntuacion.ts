// Las reseñas guardan estrellas del 1 al 5; el público ve una puntuación de 0 a 10
// con un decimal y las estrellas redondeadas a la entera más cercana.

// Promedio de las estrellas por 2, con un decimal. Sin reseñas devuelve null.
export function puntuacionPromedio(estrellas: number[]): number | null {
  let puntuacion: number | null = null;

  if (estrellas.length > 0) {
    let suma = 0;

    for (const cantidad of estrellas) {
      suma = suma + cantidad;
    }

    const promedio = suma / estrellas.length;
    const sobreDiez = promedio * 2;

    puntuacion = Math.round(sobreDiez * 10) / 10;
  }

  return puntuacion;
}

// 8,7 de 10 son 4,35 estrellas: se muestran 4.
export function estrellasDePuntuacion(puntuacion: number): number {
  const sobreCinco = puntuacion / 2;
  const estrellas = Math.round(sobreCinco);

  return estrellas;
}
