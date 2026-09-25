import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';

// Una reseña con el nombre público de su autor (US-06.06).
export interface ResenaConAutor {
  id: string;
  estrellas: number;
  comentario: string | null;
  creadaEn: Date;
  autor: string;
}

@Service()
export class ResenasService {
  private supS = inject(Supabase);

  // Todas las reseñas de la película, de la más reciente a la más antigua. El
  // nombre del autor sale de v_perfiles_publicos, que el público sí puede leer.
  async listarDePelicula(peliculaId: string): Promise<ResenaConAutor[]> {
    const { data, error } = await this.supS.Sup.from('resenas')
      .select('id, estrellas, comentario, creada_en, usuario_id')
      .eq('pelicula_id', peliculaId)
      .order('creada_en', { ascending: false });
    if (error !== null) {
      throw error;
    }

    const nombres = new Map<string, string>();
    const idsUsuarios = new Set<string>();

    for (const fila of data) {
      idsUsuarios.add(fila.usuario_id);
    }

    if (idsUsuarios.size !== 0) {
      const ids = [...idsUsuarios];
      const { data: perfiles, error: errorPerfiles } = await this.supS.Sup.from(
        'v_perfiles_publicos',
      )
        .select('id, nombre')
        .in('id', ids);
      if (errorPerfiles !== null) {
        throw errorPerfiles;
      }

      for (const perfil of perfiles) {
        if (perfil.id !== null && perfil.nombre !== null) {
          nombres.set(perfil.id, perfil.nombre);
        }
      }
    }

    const resenas: ResenaConAutor[] = [];

    for (const fila of data) {
      const creadaEn = new Date(fila.creada_en);
      const autor = buscarNombre(nombres, fila.usuario_id);

      const resena: ResenaConAutor = {
        id: fila.id,
        estrellas: fila.estrellas,
        comentario: fila.comentario,
        creadaEn: creadaEn,
        autor: autor,
      };

      resenas.push(resena);
    }

    return resenas;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function buscarNombre(nombres: Map<string, string>, usuarioId: string): string {
  let nombre = 'Espectador';
  const encontrado = nombres.get(usuarioId);

  if (encontrado !== undefined) {
    nombre = encontrado;
  }

  return nombre;
}
