import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import { nombreGenero } from '../models/pelicula';
import type { PeliculaConCatalogo, PeliculaEnCartelera } from '../models/pelicula';
import type { Preventa } from '../models/precio';
import { estaEnPreventa, ventaAbierta } from '../reglas/preventa';
import { puntuacionPromedio } from '../reglas/puntuacion';

const SELECCION =
  '*, clasificacion:clasificaciones(codigo, edad_minima), pelicula_generos(genero:generos(id, nombre))';

type Ventana = Pick<Preventa, 'pelicula_id' | 'habilitada' | 'dias_antes'>;

// Películas que el público puede comprar ahora (US-06.03).
@Service()
export class CarteleraService {
  private supS = inject(Supabase);

  // Películas activas con al menos una función futura cuya venta ya abrió.
  async listarEnCartelera(): Promise<PeliculaEnCartelera[]> {
    const ahora = new Date();
    const ahoraIso = ahora.toISOString();

    const { data: peliculas, error: errorPeliculas } = await this.supS.Sup.from('peliculas')
      .select(SELECCION)
      .eq('activo', true)
      .order('titulo');
    if (errorPeliculas !== null) {
      throw errorPeliculas;
    }

    const { data: funciones, error: errorFunciones } = await this.supS.Sup.from('funciones')
      .select('pelicula_id')
      .gt('comienza_en', ahoraIso)
      .neq('estado', 'cancelada');
    if (errorFunciones !== null) {
      throw errorFunciones;
    }

    const { data: preventas, error: errorPreventas } = await this.supS.Sup.from('preventas').select(
      'pelicula_id, habilitada, dias_antes',
    );
    if (errorPreventas !== null) {
      throw errorPreventas;
    }

    const { data: resenas, error: errorResenas } =
      await this.supS.Sup.from('resenas').select('pelicula_id, estrellas');
    if (errorResenas !== null) {
      throw errorResenas;
    }

    const conFunciones = new Set<string>();

    for (const funcion of funciones) {
      conFunciones.add(funcion.pelicula_id);
    }

    const catalogo = peliculas as PeliculaConCatalogo[];
    const enCartelera: PeliculaEnCartelera[] = [];

    for (const pelicula of catalogo) {
      const preventa = buscarPreventa(preventas, pelicula.id);
      const abierta = ventaAbierta(pelicula.fecha_estreno, preventa, ahora);

      if (conFunciones.has(pelicula.id) && abierta) {
        const estrellas = estrellasDe(resenas, pelicula.id);
        const generos = nombresDeGeneros(pelicula);
        const puntuacion = puntuacionPromedio(estrellas);
        const enPreventa = estaEnPreventa(pelicula.fecha_estreno, preventa, ahora);

        const peliculaEnCartelera: PeliculaEnCartelera = {
          ...pelicula,
          generos: generos,
          puntuacion: puntuacion,
          enPreventa: enPreventa,
        };

        enCartelera.push(peliculaEnCartelera);
      }
    }

    return enCartelera;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function buscarPreventa(preventas: Ventana[], peliculaId: string): Ventana | null {
  let encontrada: Ventana | null = null;

  for (const preventa of preventas) {
    if (preventa.pelicula_id === peliculaId) {
      encontrada = preventa;
    }
  }

  return encontrada;
}

function estrellasDe(
  resenas: { pelicula_id: string; estrellas: number }[],
  peliculaId: string,
): number[] {
  const estrellas: number[] = [];

  for (const resena of resenas) {
    if (resena.pelicula_id === peliculaId) {
      estrellas.push(resena.estrellas);
    }
  }

  return estrellas;
}

function nombresDeGeneros(pelicula: PeliculaConCatalogo): string[] {
  const nombres: string[] = [];

  for (const relacion of pelicula.pelicula_generos) {
    const nombre = nombreGenero(relacion.genero.nombre);

    if (nombres.includes(nombre) === false) {
      nombres.push(nombre);
    }
  }

  return nombres;
}
