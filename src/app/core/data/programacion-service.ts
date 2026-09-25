import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
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

  async obtenerSalasActivas(): Promise<Sala[]> {
    const salas = await this.salasService.listar();
    return salas.filter((s) => s.activa).sort((a, b) => a.numero - b.numero);
  }

  // Si no está configurado, uso los 30 minutos que pide el enunciado.
  async obtenerMinutosLimpieza(): Promise<number> {
    const { data, error } = await this.supS.Sup.from('configuracion')
      .select('valor')
      .eq('clave', 'minutos_limpieza')
      .single();
    if (error) return 30;
    return parseInt(data.valor, 10) || 30;
  }

  async obtenerFormatos(): Promise<FormatoInfo[]> {
    const { data, error } = await this.supS.Sup.from('formatos')
      .select('id, codigo, nombre')
      .order('id');
    if (error) throw error;
    return data;
  }

  async obtenerVersionesIdioma(): Promise<VersionIdiomaInfo[]> {
    const { data, error } = await this.supS.Sup.from('versiones_idioma')
      .select('id, codigo, nombre')
      .order('id');
    if (error) throw error;
    return data;
  }

  async consultarFuncionesDelDia(fechaStr: string): Promise<Funcion[]> {
    const { data, error } = await this.supS.Sup.from('funciones')
      .select('*')
      .gte('comienza_en', `${fechaStr}T00:00:00.000Z`)
      .lte('comienza_en', `${fechaStr}T23:59:59.999Z`)
      .neq('estado', 'cancelada');
    if (error) throw error;
    return data as Funcion[];
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
    for (const oc of ocurrencias) {
      if (!funcionesPorDia.has(oc.fecha)) {
        funcionesPorDia.set(oc.fecha, await this.consultarFuncionesDelDia(oc.fecha));
      }
    }

    const resultado: ItemResumenProgramacion[] = [];
    for (const oc of ocurrencias) {
      const funcionesDelDia = funcionesPorDia.get(oc.fecha)!;
      const sala = asignarSala(
        salas,
        funcionesDelDia,
        oc.fechaHora,
        params.duracionMin,
        minutosLimpieza,
      );

      if (!sala) {
        resultado.push({
          ocurrencia: oc,
          sala: null,
          asignada: false,
          motivo: `Sin sala disponible: ${formatearDiaFechaHora(oc.fecha, oc.hora)}`,
        });
        continue;
      }

      resultado.push({ ocurrencia: oc, sala, asignada: true });

      // Sumo la función al día como si ya existiera, así las siguientes de esta
      // misma programación no se superponen en la misma sala.
      const inicio = oc.fechaHora.getTime();
      const ahora = new Date().toISOString();
      funcionesDelDia.push({
        id: `simulada-${oc.fecha}-${oc.hora}`,
        sala_id: sala.id,
        pelicula_id: params.peliculaId,
        formato_id: params.formatoId,
        version_idioma_id: params.versionIdiomaId,
        comienza_en: oc.fechaHora.toISOString(),
        duracion_min: params.duracionMin,
        termina_en: new Date(inicio + params.duracionMin * 60000).toISOString(),
        libre_desde: new Date(
          inicio + (params.duracionMin + minutosLimpieza) * 60000,
        ).toISOString(),
        estado: 'programada',
        creada_en: ahora,
        actualizado_en: ahora,
      });
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
      if (!item.asignada || !item.sala) continue;

      const { error } = await this.supS.Sup.from('funciones').insert({
        pelicula_id: peliculaId,
        sala_id: item.sala.id,
        formato_id: formatoId,
        version_idioma_id: versionIdiomaId,
        comienza_en: item.ocurrencia.fechaHora.toISOString(),
        duracion_min: duracionMin,
        estado: 'programada',
      });

      if (error) {
        fallidas++;
        errores.push(
          `Error al programar ${item.ocurrencia.fecha} ${item.ocurrencia.hora}: ${error.message}`,
        );
      } else {
        creadas++;
      }
    }

    return { creadas, fallidas, errores };
  }

  async contarEntradasVendidas(funcionId: string): Promise<number> {
    const { count, error } = await this.supS.Sup.from('entradas')
      .select('*', { count: 'exact', head: true })
      .eq('funcion_id', funcionId)
      .is('anulada_en', null);
    if (error) throw error;
    return count ?? 0;
  }

  async eliminarFuncion(funcionId: string): Promise<void> {
    const mensaje = 'No se puede eliminar una función con entradas vendidas';
    if ((await this.contarEntradasVendidas(funcionId)) > 0) {
      throw new Error(mensaje);
    }

    const { error } = await this.supS.Sup.from('funciones').delete().eq('id', funcionId);
    // 23503: todavía hay entradas (aunque estén anuladas) que apuntan a la función.
    if (error?.code === '23503') throw new Error(mensaje);
    if (error) throw error;
  }

  async obtenerDetalleCancelacion(funcionId: string): Promise<DetalleCancelacionFuncion> {
    const { data, error } = await this.supS.Sup.from('entradas')
      .select('id, compras(id, codigo, usuario_id)')
      .eq('funcion_id', funcionId)
      .is('anulada_en', null);
    if (error) throw error;

    // Agrupo las entradas por compra.
    const compras = new Map<
      string,
      { codigo: string; usuarioId: string | null; cantidad: number }
    >();
    for (const entrada of data) {
      const compra = entrada.compras;
      if (!compra) continue;
      const existente = compras.get(compra.id);
      if (existente) {
        existente.cantidad++;
      } else {
        compras.set(compra.id, {
          codigo: compra.codigo || 'SIN-CODIGO',
          usuarioId: compra.usuario_id,
          cantidad: 1,
        });
      }
    }

    let comprasRegistradas = 0;
    const comprasAnonimas: CompraResumenCancelacion[] = [];
    const usuarioIds = new Set<string>();
    for (const compra of compras.values()) {
      if (compra.usuarioId) {
        comprasRegistradas++;
        usuarioIds.add(compra.usuarioId);
      } else {
        comprasAnonimas.push({ codigo: compra.codigo, cantidadEntradas: compra.cantidad });
      }
    }

    return {
      funcionId,
      totalEntradas: data.length,
      comprasRegistradas,
      comprasAnonimas,
      usuarioIds: [...usuarioIds],
    };
  }

  async cancelarFuncion(
    funcionId: string,
    peliculaTitulo?: string,
    fechaHora?: string,
  ): Promise<void> {
    const detalle = await this.obtenerDetalleCancelacion(funcionId);

    const { error } = await this.supS.Sup.from('funciones')
      .update({ estado: 'cancelada' })
      .eq('id', funcionId);
    if (error) throw error;

    if (detalle.usuarioIds.length === 0) return;

    const titulo = peliculaTitulo || 'Función';
    const pelicula = peliculaTitulo || 'la película';
    const horario = fechaHora || 'horario programado';
    const notificaciones = detalle.usuarioIds.map((usuarioId) => ({
      usuario_id: usuarioId,
      titulo: `Función cancelada: ${titulo}`,
      mensaje: `La función de ${pelicula} programada para el ${horario} fue cancelada. Se acreditó el dinero a favor en tu cuenta.`,
      tipo: 'funcion_cancelada',
    }));
    // Si RLS no deja insertar las notificaciones, la función ya quedó cancelada
    // igual: por eso no miro el error.
    await this.supS.Sup.from('notificaciones').insert(notificaciones);
  }
}
