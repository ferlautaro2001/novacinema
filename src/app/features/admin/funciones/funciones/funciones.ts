import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  DetalleCancelacionFuncion,
  ProgramacionService,
} from '../../../../core/data/programacion-service';
import { SalasService } from '../../../../core/data/salas-service';
import { PeliculasService } from '../../../../core/data/peliculas-service';
import type { Funcion } from '../../../../core/models/funcion';
import type { Sala } from '../../../../core/models/sala';
import type { PeliculaConCatalogo } from '../../../../core/models/pelicula';
import { SelectorFecha } from '../../../../shared/ui/selector-fecha/selector-fecha';
import { TablaDatos } from '../../../../shared/ui/tabla-datos/tabla-datos';
import { Cargando, EstadoConsulta } from '../../../../shared/directivas/cargando';
import { Modal } from '../../../../shared/ui/modal/modal';
import { FocoInicial } from '../../../../shared/directivas/foco-inicial';

interface FuncionFila {
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

interface SalaGrupo {
  id: string;
  sala: Sala;
  funciones: FuncionFila[];
}

@Component({
  selector: 'nc-funciones',
  imports: [DatePipe, RouterLink, SelectorFecha, TablaDatos, Cargando, Modal, FocoInicial],
  templateUrl: './funciones.html',
  styleUrl: './funciones.css',
})
export class Funciones implements OnInit {
  private programacionService = inject(ProgramacionService);
  private salasService = inject(SalasService);
  private peliculasService = inject(PeliculasService);

  fechaSeleccionada = signal(this.aIso(new Date()));
  estado = signal<EstadoConsulta<SalaGrupo>>({ tipo: 'cargando' });
  confirmacion = signal<FuncionFila | null>(null);
  confirmacionCancelar = signal<{
    funcion: FuncionFila;
    detalle: DetalleCancelacionFuncion;
  } | null>(null);
  aviso = signal('');
  error = signal('');
  eliminando = signal<string | null>(null);
  cancelando = signal<string | null>(null);

  // Cargo salas, películas, formatos e idiomas una sola vez para armar las filas sin
  // volver a consultarlos cada vez que cambia el día.
  private salas: Sala[] = [];
  private peliculas = new Map<string, PeliculaConCatalogo>();
  private formatos = new Map<number, string>();
  private idiomas = new Map<number, string>();

  async ngOnInit(): Promise<void> {
    try {
      const [salas, peliculas, formatos, idiomas] = await Promise.all([
        this.salasService.listar(),
        this.peliculasService.listar(),
        this.programacionService.obtenerFormatos(),
        this.programacionService.obtenerVersionesIdioma(),
      ]);

      this.salas = salas.sort((a, b) => a.numero - b.numero);
      for (const p of peliculas) this.peliculas.set(p.id, p);
      for (const f of formatos) this.formatos.set(f.id, f.codigo);
      for (const i of idiomas) this.idiomas.set(i.id, i.nombre);

      await this.cargarFunciones(this.fechaSeleccionada());
    } catch (e: any) {
      const mensaje = e?.message || 'Error al cargar datos';
      this.error.set(mensaje);
      this.estado.set({ tipo: 'error', mensaje });
    }
  }

  async onFechaElegida(fecha: Date): Promise<void> {
    const iso = this.aIso(fecha);
    this.fechaSeleccionada.set(iso);
    this.error.set('');
    this.aviso.set('');
    await this.cargarFunciones(iso);
  }

  async cargarFunciones(fechaStr: string): Promise<void> {
    this.estado.set({ tipo: 'cargando' });
    try {
      const datos = await this.programacionService.consultarFuncionesDelDia(fechaStr);

      const filas = datos.map((f) => this.armarFila(f));
      filas.sort((a, b) => new Date(a.comienzaEn).getTime() - new Date(b.comienzaEn).getTime());

      const grupos: SalaGrupo[] = [];
      for (const sala of this.salas) {
        const funciones = filas.filter((f) => f.salaId === sala.id);
        if (funciones.length > 0) {
          grupos.push({ id: sala.id, sala, funciones });
        }
      }

      this.estado.set({ tipo: 'datos', datos: grupos });
    } catch (e: any) {
      const mensaje = e?.message || 'Error al consultar las funciones del día';
      this.error.set(mensaje);
      this.estado.set({ tipo: 'error', mensaje });
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
      const detalle = await this.programacionService.obtenerDetalleCancelacion(funcion.id);
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
        funcion.comienzaEn,
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

  private armarFila(f: Funcion): FuncionFila {
    const titulo = this.peliculas.get(f.pelicula_id)?.titulo || 'Película';
    const formato = this.formatos.get(f.formato_id) || '2D';
    const idioma = this.idiomas.get(f.version_idioma_id) || 'Castellano';
    const inicio = this.horaMinuto(f.comienza_en);
    const fin = this.horaMinuto(f.termina_en);

    return {
      id: f.id,
      peliculaId: f.pelicula_id,
      peliculaTitulo: titulo,
      salaId: f.sala_id,
      salaNombre: this.salas.find((s) => s.id === f.sala_id)?.nombre || 'Sala',
      comienzaEn: f.comienza_en,
      terminaEn: f.termina_en,
      formatoCodigo: formato,
      versionIdiomaNombre: idioma,
      estado: f.estado,
      textoResumen: `${titulo} · ${inicio}–${fin} · ${formato} · ${idioma}`,
    };
  }

  private horaMinuto(iso: string): string {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private aIso(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
