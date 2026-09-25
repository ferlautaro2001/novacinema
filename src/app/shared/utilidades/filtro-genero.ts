// Filtro de películas por género (US-06.05).

// true si la película tiene ese género entre los suyos. Un género vacío ("Todos")
// coincide con todo.
export function incluyeGenero(generos: string[], genero: string): boolean {
  let incluye = true;

  if (genero !== '') {
    incluye = generos.includes(genero);
  }

  return incluye;
}
