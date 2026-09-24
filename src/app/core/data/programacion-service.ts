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
  semanas: number; // 1, 2, 3, 4
  diasSemana: number[]; // 1=Lun ... 7=Dom
  horarios: string[]; // ['18:00', '21:00']
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

@Service()
export class ProgramacionService {
  private supS = inject(Supabase);
  private salasService = inject(SalasService);

  async obtenerSalasActivas(): Promise<Sala[]> {
    const salas = await this.salasService.listar();
    return salas.filter((s) => s.activa).sort((a, b) => a.numero - b.numero);
  }

  async obtenerMinutosLimpieza(): Promise<number> {
    try {
      const { data, error } = await this.supS.Sup
        .from('configuracion')
        .select('valor')
        .eq('clave', 'minutos_limpieza')
        .single();
      if (error || !data) return 30;
      return parseInt(data.valor, 10) || 30;
    } catch {
      return 30;
    }
  }

  async obtenerFormatos(): Promise<FormatoInfo[]> {
    const { data, error } = await this.supS.Sup
      .from('formatos')
      .select('id, codigo, nombre')
      .order('id');
    if (error) throw error;
    return data ?? [];
  }

  async obtenerVersionesIdioma(): Promise<VersionIdiomaInfo[]> {
    const { data, error } = await this.supS.Sup
      .from('versiones_idioma')
      .select('id, codigo, nombre')
      .order('id');
    if (error) throw error;
    return data ?? [];
  }

  async consultarFuncionesDelDia(fechaStr: string): Promise<Funcion[]> {
    const desde = `${fechaStr}T00:00:00.000Z`;
    const hasta = `${fechaStr}T23:59:59.999Z`;

    const { data, error } = await this.supS.Sup
      .from('funciones')
      .select('*')
      .gte('comienza_en', desde)
      .lte('comienza_en', hasta)
      .neq('estado', 'cancelada');

    if (error) throw error;
    return (data as Funcion[]) ?? [];
  }

  async calcularProgramacion(
    params: ParametrosProgramacion
  ): Promise<ItemResumenProgramacion[]> {
    const salas = await this.obtenerSalasActivas();
    const minutosLimpieza = await this.obtenerMinutosLimpieza();
    const ocurrencias = calcularOcurrencias(
      params.fechaInicio,
      params.semanas,
      params.diasSemana,
      params.horarios
    );

    const funcionesPorDia = new Map<string, Funcion[]>();
    const fechasUnicas = [...new Set(ocurrencias.map((o) => o.fecha))];

    for (const f of fechasUnicas) {
      const lista = await this.consultarFuncionesDelDia(f);
      funcionesPorDia.set(f, [...lista]);
    }

    const resultado: ItemResumenProgramacion[] = [];

    for (const oc of ocurrencias) {
      const funcionesExistentes = funcionesPorDia.get(oc.fecha) || [];
      const sala = asignarSala(
        salas,
        funcionesExistentes,
        oc.fechaHora,
        params.duracionMin,
        minutosLimpieza
      );

      if (sala) {
        resultado.push({
          ocurrencia: oc,
          sala,
          asignada: true,
        });

        // Agregamos virtualmente la función asignada a la lista del día para que
        // las siguientes ocurrencias de esa misma programación no choquen en la misma sala
        funcionesExistentes.push({
          id: `simulada-${oc.fecha}-${oc.hora}`,
          sala_id: sala.id,
          pelicula_id: params.peliculaId,
          formato_id: params.formatoId,
          version_idioma_id: params.versionIdiomaId,
          comienza_en: oc.fechaHora.toISOString(),
          duracion_min: params.duracionMin,
          termina_en: new Date(oc.fechaHora.getTime() + params.duracionMin * 60000).toISOString(),
          libre_desde: new Date(oc.fechaHora.getTime() + (params.duracionMin + minutosLimpieza) * 60000).toISOString(),
          estado: 'programada',
          creada_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        });
      } else {
        resultado.push({
          ocurrencia: oc,
          sala: null,
          asignada: false,
          motivo: `Sin sala disponible: ${formatearDiaFechaHora(oc.fecha, oc.hora)}`,
        });
      }
    }

    return resultado;
  }

  async crearFunciones(
    items: ItemResumenProgramacion[],
    peliculaId: string,
    duracionMin: number,
    formatoId: number,
    versionIdiomaId: number
  ): Promise<{ creadas: number; fallidas: number; errores: string[] }> {
    const aCrear = items.filter((i) => i.asignada && i.sala !== null);
    let creadas = 0;
    let fallidas = 0;
    const errores: string[] = [];

    for (const item of aCrear) {
      try {
        const { error } = await this.supS.Sup.from('funciones').insert({
          pelicula_id: peliculaId,
          sala_id: item.sala!.id,
          formato_id: formatoId,
          version_idioma_id: versionIdiomaId,
          comienza_en: item.ocurrencia.fechaHora.toISOString(),
          duracion_min: duracionMin,
          estado: 'programada',
        });

        if (error) {
          fallidas++;
          errores.push(
            `Error al programar ${item.ocurrencia.fecha} ${item.ocurrencia.hora}: ${error.message}`
          );
        } else {
          creadas++;
        }
      } catch (err: any) {
        fallidas++;
        errores.push(err?.message || 'Error inesperado');
      }
    }

    return { creadas, fallidas, errores };
  }

  async contarEntradasVendidas(funcionId: string): Promise<number> {
    const { count, error } = await this.supS.Sup
      .from('entradas')
      .select('*', { count: 'exact', head: true })
      .eq('funcion_id', funcionId)
      .is('anulada_en', null);

    if (error) throw error;
    return count ?? 0;
  }

  async eliminarFuncion(funcionId: string): Promise<void> {
    const entradas = await this.contarEntradasVendidas(funcionId);
    if (entradas > 0) {
      throw new Error('No se puede eliminar una función con entradas vendidas');
    }

    const { error } = await this.supS.Sup
      .from('funciones')
      .delete()
      .eq('id', funcionId);

    if (error) {
      if (error.code === '23503') {
        throw new Error('No se puede eliminar una función con entradas vendidas');
      }
      throw error;
    }
  }
}
