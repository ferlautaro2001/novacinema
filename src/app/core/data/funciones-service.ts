import { inject, Service } from '@angular/core';
import type { Tables } from '../supabase/database.types';
import { Supabase } from '../supabase/supabase-client';
import type { FuncionParaComprar } from '../models/funcion';
import type { Preventa } from '../models/precio';
import { ventaAbierta } from '../reglas/preventa';
import { inicioDelDia } from '../../shared/utilidades/fechas';

// La fila cruda de la vista de compra, tal como la devuelve PostgREST: casi
// todas las columnas nullable, aunque el join siempre las traiga.
type FilaFuncionParaComprar = Tables<'v_funciones_para_comprar'>;

// Una función tal como la ve el público en el detalle de la película (US-06.06).
export interface FuncionEnVenta {
  id: string;
  comienzaEn: Date;
  formato: string;
  idioma: string;
}

// Las funciones de un mismo día, para listarlas agrupadas. El tipo de función
// viene por parámetro porque el detalle muestra las suyas y la compra muestra
// las de v_funciones_para_comprar, pero las dos se agrupan igual.
export interface DiaDeFunciones<T = FuncionEnVenta> {
  dia: Date;
  funciones: T[];
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

  // Las funciones que el cliente puede elegir para esta película, agrupadas por
  // día (US-07.01). La vista ya dejó afuera lo que no se puede comprar: las que
  // todavía no empezaron y las que están antes de que abra la preventa. Las
  // agotadas sí vienen, con las butacas en cero, para poder mostrarlas marcadas.
  async listarParaComprar(peliculaId: string): Promise<DiaDeFunciones<FuncionParaComprar>[]> {
    // SELECT * FROM v_funciones_para_comprar
    //   WHERE pelicula_id = peliculaId ORDER BY comienza_en
    const { data, error } = await this.supS.Sup.from('v_funciones_para_comprar')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('comienza_en');
    if (error !== null) {
      throw error;
    }

    const funciones: FuncionParaComprar[] = [];

    for (const fila of data) {
      const funcion = filaAFuncion(fila);

      if (funcion !== null) {
        funciones.push(funcion);
      }
    }

    const dias = agruparPorDia(funciones);

    return dias;
  }

  // Una función puntual, para el resumen que se ve al entrar a la compra. Si la
  // función ya no está a la venta (empezó, se canceló o ya no queda el día), la
  // vista no la trae y se devuelve null.
  async buscarParaComprar(funcionId: string): Promise<FuncionParaComprar | null> {
    // SELECT * FROM v_funciones_para_comprar
    //   WHERE funcion_id = funcionId
    const { data, error } = await this.supS.Sup.from('v_funciones_para_comprar')
      .select('*')
      .eq('funcion_id', funcionId)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    let resultado: FuncionParaComprar | null = null;

    if (data !== null) {
      resultado = filaAFuncion(data);
    }

    return resultado;
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
// Sirve para las dos formas de función porque lo único que mira es cuándo empieza.
function agruparPorDia<T extends { comienzaEn: Date }>(funciones: T[]): DiaDeFunciones<T>[] {
  const dias: DiaDeFunciones<T>[] = [];
  let actual: DiaDeFunciones<T> | null = null;

  for (const funcion of funciones) {
    let esOtroDia = false;

    if (actual === null) {
      esOtroDia = true;
    } else if (actual.dia.toDateString() !== funcion.comienzaEn.toDateString()) {
      esOtroDia = true;
    }

    if (esOtroDia) {
      const dia = inicioDelDia(funcion.comienzaEn);
      actual = { dia: dia, funciones: [] };
      dias.push(actual);
    }

    if (actual !== null) {
      actual.funciones.push(funcion);
    }
  }

  return dias;
}

// Convierte una fila de v_funciones_para_comprar. Devuelve null si la función
// no vino con id, que no puede pasar en la práctica pero es lo único nullable
// que no tiene arreglo: sin id no hay función a la que llevar.
function filaAFuncion(fila: FilaFuncionParaComprar): FuncionParaComprar | null {
  let resultado: FuncionParaComprar | null = null;
  const id = fila.funcion_id;

  if (id !== null) {
    const butacasLibres = numeroDe(fila.butacas_libres);
    const totalButacas = numeroDe(fila.total_butacas);
    const agotada = butacasLibres === 0;

    const funcion: FuncionParaComprar = {
      id: id,
      peliculaId: fila.pelicula_id,
      peliculaTitulo: textoDe(fila.pelicula_titulo),
      sala: textoDe(fila.sala),
      comienzaEn: new Date(fila.comienza_en),
      formato: textoDe(fila.formato),
      idioma: textoDe(fila.idioma),
      totalButacas: totalButacas,
      butacasLibres: butacasLibres,
      agotada: agotada,
      enPreventa: fila.en_preventa === true,
    };

    resultado = funcion;
  }

  return resultado;
}

// Las columnas de las vistas llegan nullable aunque el join siempre las traiga.
// Para armar el modelo se completan con vacío, así no se pierde una función que
// el cliente sí puede comprar.
function textoDe(columna: string | null): string {
  let texto = '';

  if (columna !== null) {
    texto = columna;
  }

  return texto;
}

// Igual que textoDe, pero para los conteos. Cuando no se sabe cuántas butacas
// quedan se toma cero, que deja la función marcada como agotada: es el estado
// que hace que no se pueda comprar, que es lo más prudente ante la duda.
function numeroDe(columna: number | null): number {
  let numero = 0;

  if (columna !== null) {
    numero = columna;
  }

  return numero;
}
