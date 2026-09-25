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

      this.salas = salas.sort(porNumeroDeSala);

      for (const pelicula of peliculas) {
        this.peliculas.set(pelicula.id, pelicula);
      }

      for (const formato of formatos) {
        this.formatos.set(formato.id, formato.codigo);
      }

      for (const idioma of idiomas) {
        this.idiomas.set(idioma.id, idioma.nombre);
      }

      const fecha = this.fechaSeleccionada();
      await this.cargarFunciones(fecha);
    } catch (e: any) {
      const mensaje = mensajeDeError(e, 'Error al cargar datos');
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

      const filas: FuncionFila[] = [];

      for (const funcion of datos) {
        const fila = this.armarFila(funcion);
        filas.push(fila);
      }

      filas.sort(porComienzo);

      const grupos: SalaGrupo[] = [];

      for (const sala of this.salas) {
        const funciones = funcionesDeSala(filas, sala.id);

        if (funciones.length > 0) {
          grupos.push({ id: sala.id, sala, funciones });
        }
      }

      this.estado.set({ tipo: 'datos', datos: grupos });
    } catch (e: any) {
      const mensaje = mensajeDeError(e, 'Error al consultar las funciones del día');
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
      } else {
        this.confirmacion.set(funcion);
      }
    } catch (e: any) {
      const mensaje = mensajeDeError(e, 'Error al verificar las entradas vendidas');
      this.error.set(mensaje);
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

      const fecha = this.fechaSeleccionada();
      await this.cargarFunciones(fecha);
    } catch (e: any) {
      const mensaje = mensajeDeError(e, 'Error al eliminar la función');
      this.error.set(mensaje);
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
      const mensaje = mensajeDeError(e, 'Error al consultar las compras de la función');
      this.error.set(mensaje);
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

      const fecha = this.fechaSeleccionada();
      await this.cargarFunciones(fecha);
    } catch (e: any) {
      const mensaje = mensajeDeError(e, 'Error al cancelar la función');
      this.error.set(mensaje);
      this.confirmacionCancelar.set(null);
    } finally {
      this.cancelando.set(null);
    }
  }

  private armarFila(funcion: Funcion): FuncionFila {
    const pelicula = this.peliculas.get(funcion.pelicula_id);
    const formatoEncontrado = this.formatos.get(funcion.formato_id);
    const idiomaEncontrado = this.idiomas.get(funcion.version_idioma_id);
    const inicio = this.horaMinuto(funcion.comienza_en);
    const fin = this.horaMinuto(funcion.termina_en);
    const salaNombre = nombreDeSala(this.salas, funcion.sala_id);

    let titulo = 'Película';

    if (pelicula !== undefined && pelicula.titulo !== '') {
      titulo = pelicula.titulo;
    }

    const formato = textoOPorDefecto(formatoEncontrado, '2D');
    const idioma = textoOPorDefecto(idiomaEncontrado, 'Castellano');

    const fila: FuncionFila = {
      id: funcion.id,
      peliculaId: funcion.pelicula_id,
      peliculaTitulo: titulo,
      salaId: funcion.sala_id,
      salaNombre: salaNombre,
      comienzaEn: funcion.comienza_en,
      terminaEn: funcion.termina_en,
      formatoCodigo: formato,
      versionIdiomaNombre: idioma,
      estado: funcion.estado,
      textoResumen: `${titulo} · ${inicio}–${fin} · ${formato} · ${idioma}`,
    };

    return fila;
  }

  private horaMinuto(iso: string): string {
    const fecha = new Date(iso);
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    const hora = `${horas}:${minutos}`;

    return hora;
  }

  private aIso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    const iso = `${anio}-${mes}-${dia}`;

    return iso;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function porNumeroDeSala(salaA: Sala, salaB: Sala): number {
  const diferencia = salaA.numero - salaB.numero;

  return diferencia;
}

function porComienzo(filaA: FuncionFila, filaB: FuncionFila): number {
  const comienzoA = new Date(filaA.comienzaEn).getTime();
  const comienzoB = new Date(filaB.comienzaEn).getTime();
  const diferencia = comienzoA - comienzoB;

  return diferencia;
}

function funcionesDeSala(filas: FuncionFila[], salaId: string): FuncionFila[] {
  const funciones: FuncionFila[] = [];

  for (const fila of filas) {
    if (fila.salaId === salaId) {
      funciones.push(fila);
    }
  }

  return funciones;
}

function nombreDeSala(salas: Sala[], salaId: string): string {
  let nombre = 'Sala';
  let encontrada = false;

  for (const sala of salas) {
    if (encontrada === false && sala.id === salaId) {
      encontrada = true;

      if (sala.nombre !== '') {
        nombre = sala.nombre;
      }
    }
  }

  return nombre;
}

function textoOPorDefecto(valor: string | undefined, porDefecto: string): string {
  let texto = porDefecto;

  if (valor !== undefined && valor !== '') {
    texto = valor;
  }

  return texto;
}

function mensajeDeError(error: any, porDefecto: string): string {
  let mensaje = porDefecto;

  if (error !== null && error !== undefined) {
    const mensajeOriginal = error.message;

    if (mensajeOriginal !== undefined && mensajeOriginal !== null && mensajeOriginal !== '') {
      mensaje = mensajeOriginal;
    }
  }

  return mensaje;
}
