import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import type { Preventa } from '../models/precio';
import { ventaAbierta } from '../reglas/preventa';

// Una función tal como la ve el público en el detalle de la película (US-06.06).
export interface FuncionEnVenta {
  id: string;
  comienzaEn: Date;
  formato: string;
  idioma: string;
}

// Las funciones de un mismo día, para listarlas agrupadas.
export interface DiaDeFunciones {
  dia: Date;
  funciones: FuncionEnVenta[];
}

@Service()
export class FuncionesService {
  private supS = inject(Supabase);

  // Funciones futuras y no canceladas de la película, solo si su venta ya abrió
  // (preventa o estreno). Vienen ordenadas y agrupadas por día.
  async listarEnVentaPorDia(peliculaId: string, fechaEstreno: string): Promise<DiaDeFunciones[]> {
    const ahora = new Date();

    // SELECT * FROM preventas WHERE pelicula_id = peliculaId
    const { data: preventa, error: errorPreventa } = await this.supS.Sup.from('preventas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .maybeSingle();
    if (errorPreventa !== null) {
      throw errorPreventa;
    }

    const preventaTipada = preventa as Preventa | null;
    let dias: DiaDeFunciones[] = [];

    if (ventaAbierta(fechaEstreno, preventaTipada, ahora)) {
      const desde = ahora.toISOString();
      // SELECT id, comienza_en, formatos(codigo), versiones_idioma(nombre)
      //   FROM funciones
      //   WHERE pelicula_id = peliculaId AND estado = 'programada'
      //     AND comienza_en > desde ORDER BY comienza_en
      const { data, error } = await this.supS.Sup.from('funciones')
        .select('id, comienza_en, formato:formatos(codigo), version:versiones_idioma(nombre)')
        .eq('pelicula_id', peliculaId)
        .eq('estado', 'programada')
        .gt('comienza_en', desde)
        .order('comienza_en');
      if (error !== null) {
        throw error;
      }

      const funciones: FuncionEnVenta[] = [];

      for (const fila of data) {
        const comienzaEn = new Date(fila.comienza_en);
        const formato = textoRelacion(fila.formato, 'codigo');
        const idioma = textoRelacion(fila.version, 'nombre');

        const funcion: FuncionEnVenta = {
          id: fila.id,
          comienzaEn: comienzaEn,
          formato: formato,
          idioma: idioma,
        };

        funciones.push(funcion);
      }

      dias = agruparPorDia(funciones);
    }

    return dias;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function textoRelacion(relacion: Record<string, string> | null, campo: string): string {
  let texto = '';

  if (relacion !== null && relacion !== undefined) {
    texto = relacion[campo];
  }

  return texto;
}

// Las funciones llegan ordenadas: abro un día nuevo cada vez que cambia la fecha.
function agruparPorDia(funciones: FuncionEnVenta[]): DiaDeFunciones[] {
  const dias: DiaDeFunciones[] = [];
  let actual: DiaDeFunciones | null = null;

  for (const funcion of funciones) {
    let esOtroDia = false;

    if (actual === null) {
      esOtroDia = true;
    } else if (actual.dia.toDateString() !== funcion.comienzaEn.toDateString()) {
      esOtroDia = true;
    }

    if (esOtroDia) {
      const dia = new Date(funcion.comienzaEn);
      dia.setHours(0, 0, 0, 0);
      actual = { dia: dia, funciones: [] };
      dias.push(actual);
    }

    if (actual !== null) {
      actual.funciones.push(funcion);
    }
  }

  return dias;
}
