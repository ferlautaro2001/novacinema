import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  DetalleCancelacionFuncion,
  ProgramacionService,
} from '../../../core/data/programacion-service';
import { SalasService } from '../../../core/data/salas-service';
import { PeliculasService } from '../../../core/data/peliculas-service';
import type { Funcion } from '../../../core/models/funcion';
import type { Sala } from '../../../core/models/sala';
import type { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { SelectorFecha } from '../../../shared/ui/selector-fecha/selector-fecha';
import { TablaDatos } from '../../../shared/ui/tabla-datos/tabla-datos';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { Modal } from '../../../shared/ui/modal/modal';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';

export interface FuncionFila {
  id: string;
  peliculaId: string;
  peliculaTitulo: string;
  salaId: string;
  salaNombre: string;
  comienzaEn: string;
  terminaEn: string;
  formatoCodigo: string;
  versionIdiomaNombre: string;
  estado: string;
  textoResumen: string;
}

export interface SalaGrupo {
  id: string;
  sala: Sala;
  funciones: FuncionFila[];
}

@Component({
  selector: 'nc-funciones',
  imports: [
    DatePipe,
    RouterLink,
    SelectorFecha,
    TablaDatos,
    Cargando,
    Modal,
    FocoInicial,
  ],
  templateUrl: './funciones.html',
  styleUrl: './funciones.css',
})
export class Funciones implements OnInit {
  private programacionService = inject(ProgramacionService);
  private salasService = inject(SalasService);
  private peliculasService = inject(PeliculasService);

  fechaSeleccionada = signal<string>(this.obtenerHoyIso());
  estado = signal<EstadoConsulta<SalaGrupo>>({ tipo: 'cargando' });
  confirmacion = signal<FuncionFila | null>(null);
  confirmacionCancelar = signal<{
    funcion: FuncionFila;
    detalle: DetalleCancelacionFuncion;
  } | null>(null);
  aviso = signal<string>('');
  error = signal<string>('');
  eliminando = signal<string | null>(null);
  cancelando = signal<string | null>(null);

  private salasMap = new Map<string, Sala>();
  private peliculasMap = new Map<string, PeliculaConCatalogo>();
  private formatosMap = new Map<number, string>();
  private idiomasMap = new Map<number, string>();

  async ngOnInit(): Promise<void> {
    try {
      const [salas, pelis, fmts, idms] = await Promise.all([
        this.salasService.listar(),
        this.peliculasService.listar(),
        this.programacionService.obtenerFormatos(),
        this.programacionService.obtenerVersionesIdioma(),
      ]);

      salas.forEach((s) => this.salasMap.set(s.id, s));
      pelis.forEach((p) => this.peliculasMap.set(p.id, p));
      fmts.forEach((f) => this.formatosMap.set(f.id, f.codigo));
      idms.forEach((i) => this.idiomasMap.set(i.id, i.nombre));

      await this.cargarFunciones(this.fechaSeleccionada());
    } catch (e: any) {
      this.error.set(e?.message || 'Error al cargar datos');
      this.estado.set({ tipo: 'error', mensaje: e?.message || 'Error al cargar datos' });
    }
  }

  async onFechaElegida(fecha: Date): Promise<void> {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    this.fechaSeleccionada.set(iso);
    this.error.set('');
    this.aviso.set('');
    await this.cargarFunciones(iso);
  }

  async cargarFunciones(fechaStr: string): Promise<void> {
    this.estado.set({ tipo: 'cargando' });
    try {
      const datos = await this.programacionService.consultarFuncionesDelDia(fechaStr);

      const mapeadas: FuncionFila[] = datos.map((f: Funcion) => {
        const titulo = this.peliculasMap.get(f.pelicula_id)?.titulo || 'Película';
        const salaNombre = this.salasMap.get(f.sala_id)?.nombre || 'Sala';
        const formato = this.formatosMap.get(f.formato_id) || '2D';
        const idioma = this.idiomasMap.get(f.version_idioma_id) || 'Castellano';
        const inicioHora = this.obtenerHoraMinuto(f.comienza_en);
        const finHora = this.obtenerHoraMinuto(f.termina_en);

        return {
          id: f.id,
          peliculaId: f.pelicula_id,
          peliculaTitulo: titulo,
          salaId: f.sala_id,
          salaNombre,
          comienzaEn: f.comienza_en,
          terminaEn: f.termina_en,
          formatoCodigo: formato,
          versionIdiomaNombre: idioma,
          estado: f.estado,
          textoResumen: `${titulo} · ${inicioHora}–${finHora} · ${formato} · ${idioma}`,
        };
      });

      // Agrupar funciones por sala
      const salasConFunciones = new Map<string, FuncionFila[]>();
      for (const func of mapeadas) {
        if (!salasConFunciones.has(func.salaId)) {
          salasConFunciones.set(func.salaId, []);
        }
        salasConFunciones.get(func.salaId)!.push(func);
      }

      // Ordenar funciones por horario dentro de cada sala
      for (const [, lista] of salasConFunciones) {
        lista.sort(
          (a, b) => new Date(a.comienzaEn).getTime() - new Date(b.comienzaEn).getTime()
        );
      }

      // Convertir a grupos ordenados por número de sala
      const grupos: SalaGrupo[] = [];
      const salasOrdenadas = Array.from(this.salasMap.values()).sort(
        (a, b) => a.numero - b.numero
      );

      for (const sala of salasOrdenadas) {
        const funcs = salasConFunciones.get(sala.id);
        if (funcs && funcs.length > 0) {
          grupos.push({
            id: sala.id,
            sala,
            funciones: funcs,
          });
        }
      }

      this.estado.set({ tipo: 'datos', datos: grupos });
    } catch (e: any) {
      const msg = e?.message || 'Error al consultar las funciones del día';
      this.error.set(msg);
      this.estado.set({ tipo: 'error', mensaje: msg });
    }
  }

  async intentarEliminar(funcion: FuncionFila): Promise<void> {
    this.error.set('');
    this.aviso.set('');
    try {
      const ventas = await this.programacionService.contarEntradasVendidas(funcion.id);
      if (ventas > 0) {
        this.error.set('No se puede eliminar una función con entradas vendidas');
        return;
      }
      this.confirmacion.set(funcion);
    } catch (e: any) {
      this.error.set(e?.message || 'Error al verificar las entradas vendidas');
    }
  }

  async confirmarEliminacion(funcion: FuncionFila): Promise<void> {
    this.eliminando.set(funcion.id);
    this.error.set('');
    this.aviso.set('');
    try {
      await this.programacionService.eliminarFuncion(funcion.id);
      this.confirmacion.set(null);
      this.aviso.set('Función eliminada correctamente.');
      await this.cargarFunciones(this.fechaSeleccionada());
    } catch (e: any) {
      this.error.set(e?.message || 'Error al eliminar la función');
      this.confirmacion.set(null);
    } finally {
      this.eliminando.set(null);
    }
  }

  async iniciarCancelacion(funcion: FuncionFila): Promise<void> {
    this.error.set('');
    this.aviso.set('');
    try {
      const detalle = await this.programacionService.obtenerDetalleCancelacion(
        funcion.id
      );
      this.confirmacionCancelar.set({ funcion, detalle });
    } catch (e: any) {
      this.error.set(e?.message || 'Error al consultar las compras de la función');
    }
  }

  async confirmarCancelacion(funcion: FuncionFila): Promise<void> {
    this.cancelando.set(funcion.id);
    this.error.set('');
    this.aviso.set('');
    try {
      await this.programacionService.cancelarFuncion(
        funcion.id,
        funcion.peliculaTitulo,
        funcion.comienzaEn
      );
      this.confirmacionCancelar.set(null);
      this.aviso.set('Función cancelada correctamente.');
      await this.cargarFunciones(this.fechaSeleccionada());
    } catch (e: any) {
      this.error.set(e?.message || 'Error al cancelar la función');
      this.confirmacionCancelar.set(null);
    } finally {
      this.cancelando.set(null);
    }
  }

  private obtenerHoraMinuto(iso: string): string {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private obtenerHoyIso(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
