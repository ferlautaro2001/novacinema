import { inject, Service } from '@angular/core';
import type { TablesInsert } from '../supabase/database.types';
import { Supabase } from '../supabase/supabase-client';
import { AlertasService } from './alertas-service';
import { SalasService } from './salas-service';
import type { Sala } from '../models/sala';
import type { Funcion } from '../models/funcion';
import {
  asignarSala,
  calcularOcurrencias,
  formatearDiaFechaHora,
  OcurrenciaProgramacion,
} from '../reglas/asignacion-salas';

export interface ParametrosProgramacion {
  peliculaId: string;
  duracionMin: number;
  fechaInicio: string; // 'AAAA-MM-DD'
  semanas: number;
  diasSemana: number[]; // 1 = lunes ... 7 = domingo
  horarios: string[]; // 'HH:MM'
  formatoId: number;
  versionIdiomaId: number;
}

export interface ItemResumenProgramacion {
  ocurrencia: OcurrenciaProgramacion;
  sala: Sala | null;
  asignada: boolean;
  motivo?: string;
}

export interface FormatoInfo {
  id: number;
  codigo: string;
  nombre: string;
}

export interface VersionIdiomaInfo {
  id: number;
  codigo: string;
  nombre: string;
}

export interface CompraResumenCancelacion {
  codigo: string;
  cantidadEntradas: number;
}

export interface DetalleCancelacionFuncion {
  funcionId: string;
  totalEntradas: number;
  comprasRegistradas: number;
  comprasAnonimas: CompraResumenCancelacion[];
  usuarioIds: string[];
}

@Service()
export class ProgramacionService {
  private supS = inject(Supabase);
  private salasService = inject(SalasService);
  private alertas = inject(AlertasService);

  async obtenerSalasActivas(): Promise<Sala[]> {
    const salas = await this.salasService.listar();

    const salasActivas = salas.filter(estaActiva).sort(compararPorNumero);

    return salasActivas;
  }

  // Si no está configurado, uso los 30 minutos que pide el enunciado.
  async obtenerMinutosLimpieza(): Promise<number> {
    // SELECT valor FROM configuracion WHERE clave = 'minutos_limpieza'
    const { data, error } = await this.supS.Sup.from('configuracion')
      .select('valor')
      .eq('clave', 'minutos_limpieza')
      .single();

    let minutos = 30;

    if (error === null) {
      const configurado = parseInt(data.valor, 10);

      let esValido = true;

      if (Number.isNaN(configurado)) {
        esValido = false;
      } else if (configurado === 0) {
        esValido = false;
      }

      if (esValido) {
        minutos = configurado;
      }
    }

    return minutos;
  }

  async obtenerFormatos(): Promise<FormatoInfo[]> {
    // SELECT id, codigo, nombre FROM formatos ORDER BY id
    const { data, error } = await this.supS.Sup.from('formatos')
      .select('id, codigo, nombre')
      .order('id');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async obtenerVersionesIdioma(): Promise<VersionIdiomaInfo[]> {
    // SELECT id, codigo, nombre FROM versiones_idioma ORDER BY id
    const { data, error } = await this.supS.Sup.from('versiones_idioma')
      .select('id, codigo, nombre')
      .order('id');
    if (error !== null) {
      throw error;
    }

    return data;
  }

  async consultarFuncionesDelDia(fechaStr: string): Promise<Funcion[]> {
    // SELECT * FROM funciones
    //   WHERE comienza_en BETWEEN fecha 00:00:00 Y fecha 23:59:59
    //     AND estado <> 'cancelada'
    const { data, error } = await this.supS.Sup.from('funciones')
      .select('*')
      .gte('comienza_en', `${fechaStr}T00:00:00.000Z`)
      .lte('comienza_en', `${fechaStr}T23:59:59.999Z`)
      .neq('estado', 'cancelada');
    if (error !== null) {
      throw error;
    }

    const funciones = data as Funcion[];

    return funciones;
  }

  async calcularProgramacion(params: ParametrosProgramacion): Promise<ItemResumenProgramacion[]> {
    const salas = await this.obtenerSalasActivas();
    const minutosLimpieza = await this.obtenerMinutosLimpieza();
    const ocurrencias = calcularOcurrencias(
      params.fechaInicio,
      params.semanas,
      params.diasSemana,
      params.horarios,
    );

    const funcionesPorDia = new Map<string, Funcion[]>();

    for (const ocurrencia of ocurrencias) {
      let faltaConsultar = true;

      if (funcionesPorDia.has(ocurrencia.fecha)) {
        faltaConsultar = false;
      }

      if (faltaConsultar) {
        const funcionesConsultadas = await this.consultarFuncionesDelDia(ocurrencia.fecha);
        funcionesPorDia.set(ocurrencia.fecha, funcionesConsultadas);
      }
    }

    const resultado: ItemResumenProgramacion[] = [];

    for (const ocurrencia of ocurrencias) {
      const funcionesDelDia = funcionesPorDia.get(ocurrencia.fecha)!;
      const sala = asignarSala(
        salas,
        funcionesDelDia,
        ocurrencia.fechaHora,
        params.duracionMin,
        minutosLimpieza,
      );

      if (sala === null) {
        const diaFechaHora = formatearDiaFechaHora(ocurrencia.fecha, ocurrencia.hora);

        const itemSinSala: ItemResumenProgramacion = {
          ocurrencia: ocurrencia,
          sala: null,
          asignada: false,
          motivo: `Sin sala disponible: ${diaFechaHora}`,
        };

        resultado.push(itemSinSala);
      } else {
        const itemAsignado: ItemResumenProgramacion = {
          ocurrencia: ocurrencia,
          sala: sala,
          asignada: true,
        };

        resultado.push(itemAsignado);

        // Sumo la función al día como si ya existiera, así las siguientes de esta
        // misma programación no se superponen en la misma sala.
        const simulada = funcionSimulada(ocurrencia, sala, params, minutosLimpieza);
        funcionesDelDia.push(simulada);
      }
    }

    return resultado;
  }

  async crearFunciones(
    items: ItemResumenProgramacion[],
    peliculaId: string,
    duracionMin: number,
    formatoId: number,
    versionIdiomaId: number,
  ): Promise<{ creadas: number; fallidas: number; errores: string[] }> {
    let creadas = 0;
    let fallidas = 0;
    const errores: string[] = [];

    for (const item of items) {
      if (item.asignada && item.sala !== null) {
        // INSERT INTO funciones
        //   (pelicula_id, sala_id, formato_id, version_idioma_id, comienza_en,
        //    duracion_min, estado) VALUES (...)
        const { error } = await this.supS.Sup.from('funciones').insert({
          pelicula_id: peliculaId,
          sala_id: item.sala.id,
          formato_id: formatoId,
          version_idioma_id: versionIdiomaId,
          comienza_en: item.ocurrencia.fechaHora.toISOString(),
          duracion_min: duracionMin,
          estado: 'programada',
        });

        if (error !== null) {
          fallidas++;
          errores.push(
            `Error al programar ${item.ocurrencia.fecha} ${item.ocurrencia.hora}: ${error.message}`,
          );
        } else {
          creadas++;
        }
      }
    }

    // Con las primeras funciones puede abrirse la venta: aviso a los que tienen alerta
    // (US-06.08). Si falla, las funciones ya están creadas y el aviso sale al ingresar.
    if (creadas > 0) {
      try {
        await this.alertas.notificarAperturaDeVenta(peliculaId);
      } catch {
        // Sin aviso ahora; se revisa de nuevo cuando el usuario ingresa.
      }
    }

    const resumen: { creadas: number; fallidas: number; errores: string[] } = {
      creadas: creadas,
      fallidas: fallidas,
      errores: errores,
    };

    return resumen;
  }

  async contarEntradasVendidas(funcionId: string): Promise<number> {
    // SELECT * FROM entradas   (solo el conteo)
    //   WHERE funcion_id = funcionId AND anulada_en IS NULL
    const { count, error } = await this.supS.Sup.from('entradas')
      .select('*', { count: 'exact', head: true })
      .eq('funcion_id', funcionId)
      .is('anulada_en', null);
    if (error !== null) {
      throw error;
    }

    let cantidad = 0;

    if (count !== null) {
      cantidad = count;
    }

    return cantidad;
  }

  async eliminarFuncion(funcionId: string): Promise<void> {
    const mensaje = 'No se puede eliminar una función con entradas vendidas';
    const entradasVendidas = await this.contarEntradasVendidas(funcionId);

    if (entradasVendidas > 0) {
      throw new Error(mensaje);
    }

    // DELETE FROM funciones WHERE id = funcionId
    const { error } = await this.supS.Sup.from('funciones').delete().eq('id', funcionId);
    if (error !== null) {
      // 23503: todavía hay entradas (aunque estén anuladas) que apuntan a la función.
      if (error.code === '23503') {
        throw new Error(mensaje);
      }

      throw error;
    }
  }

  async obtenerDetalleCancelacion(funcionId: string): Promise<DetalleCancelacionFuncion> {
    // SELECT id, compras(id, codigo, usuario_id) FROM entradas
    //   WHERE funcion_id = funcionId AND anulada_en IS NULL
    const { data, error } = await this.supS.Sup.from('entradas')
      .select('id, compras(id, codigo, usuario_id)')
      .eq('funcion_id', funcionId)
      .is('anulada_en', null);
    if (error !== null) {
      throw error;
    }

    // Agrupo las entradas por compra.
    const compras = new Map<string, CompraAgrupada>();

    for (const entrada of data) {
      const compra = entrada.compras;

      if (compra !== null) {
        const existente = compras.get(compra.id);

        if (existente !== undefined) {
          existente.cantidad++;
        } else {
          let codigo = 'SIN-CODIGO';

          if (compra.codigo !== '') {
            codigo = compra.codigo;
          }

          const nueva: CompraAgrupada = {
            codigo: codigo,
            usuarioId: compra.usuario_id,
            cantidad: 1,
          };

          compras.set(compra.id, nueva);
        }
      }
    }

    let comprasRegistradas = 0;
    const comprasAnonimas: CompraResumenCancelacion[] = [];
    const usuarioIds = new Set<string>();

    for (const compra of compras.values()) {
      if (compra.usuarioId !== null && compra.usuarioId !== '') {
        comprasRegistradas++;
        usuarioIds.add(compra.usuarioId);
      } else {
        const anonima: CompraResumenCancelacion = {
          codigo: compra.codigo,
          cantidadEntradas: compra.cantidad,
        };

        comprasAnonimas.push(anonima);
      }
    }

    const listaUsuarioIds = [...usuarioIds];

    const detalle: DetalleCancelacionFuncion = {
      funcionId: funcionId,
      totalEntradas: data.length,
      comprasRegistradas: comprasRegistradas,
      comprasAnonimas: comprasAnonimas,
      usuarioIds: listaUsuarioIds,
    };

    return detalle;
  }

  async cancelarFuncion(
    funcionId: string,
    peliculaTitulo?: string,
    fechaHora?: string,
  ): Promise<void> {
    const detalle = await this.obtenerDetalleCancelacion(funcionId);

    // UPDATE funciones SET estado = 'cancelada' WHERE id = funcionId
    const { error } = await this.supS.Sup.from('funciones')
      .update({ estado: 'cancelada' })
      .eq('id', funcionId);
    if (error !== null) {
      throw error;
    }

    if (detalle.usuarioIds.length > 0) {
      const titulo = textoOPredeterminado(peliculaTitulo, 'Función');
      const pelicula = textoOPredeterminado(peliculaTitulo, 'la película');
      const horario = textoOPredeterminado(fechaHora, 'horario programado');

      const notificaciones: TablesInsert<'notificaciones'>[] = [];

      for (const usuarioId of detalle.usuarioIds) {
        const notificacion: TablesInsert<'notificaciones'> = {
          usuario_id: usuarioId,
          titulo: `Función cancelada: ${titulo}`,
          mensaje: `La función de ${pelicula} programada para el ${horario} fue cancelada. Se acreditó el dinero a favor en tu cuenta.`,
          tipo: 'funcion_cancelada',
        };

        notificaciones.push(notificacion);
      }

      // Si RLS no deja insertar las notificaciones, la función ya quedó cancelada
      // igual: por eso no miro el error.
      // INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (...)
      await this.supS.Sup.from('notificaciones').insert(notificaciones);
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

interface CompraAgrupada {
  codigo: string;
  usuarioId: string | null;
  cantidad: number;
}

function estaActiva(sala: Sala): boolean {
  const activa = sala.activa;

  return activa;
}

function compararPorNumero(salaA: Sala, salaB: Sala): number {
  const diferencia = salaA.numero - salaB.numero;

  return diferencia;
}

function funcionSimulada(
  ocurrencia: OcurrenciaProgramacion,
  sala: Sala,
  params: ParametrosProgramacion,
  minutosLimpieza: number,
): Funcion {
  const inicio = ocurrencia.fechaHora.getTime();
  const ahora = new Date().toISOString();
  const finMs = inicio + params.duracionMin * 60000;
  const libreDesdeMs = inicio + (params.duracionMin + minutosLimpieza) * 60000;
  const terminaEn = new Date(finMs).toISOString();
  const libreDesde = new Date(libreDesdeMs).toISOString();

  const funcion: Funcion = {
    id: `simulada-${ocurrencia.fecha}-${ocurrencia.hora}`,
    sala_id: sala.id,
    pelicula_id: params.peliculaId,
    formato_id: params.formatoId,
    version_idioma_id: params.versionIdiomaId,
    comienza_en: ocurrencia.fechaHora.toISOString(),
    duracion_min: params.duracionMin,
    termina_en: terminaEn,
    libre_desde: libreDesde,
    estado: 'programada',
    creada_en: ahora,
    actualizado_en: ahora,
  };

  return funcion;
}

function textoOPredeterminado(valor: string | undefined, porDefecto: string): string {
  let texto = porDefecto;

  if (valor !== undefined && valor !== '') {
    texto = valor;
  }

  return texto;
}
