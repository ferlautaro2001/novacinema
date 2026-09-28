import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PeliculasService } from '../../../../core/data/peliculas-service';
import {
  ItemResumenProgramacion,
  ProgramacionService,
} from '../../../../core/data/programacion-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import type { PeliculaConCatalogo } from '../../../../core/models/pelicula';
import { SelectorFecha } from '../../../../shared/ui/selector-fecha/selector-fecha';
import { mensajeDeError } from '../../../../shared/utilidades/errores';

@Component({
  selector: 'nc-programar-funciones',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, SelectorFecha],
  templateUrl: './programar-funciones.html',
  styleUrl: './programar-funciones.css',
})
export class ProgramarFunciones implements OnInit, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private router = inject(Router);
  private peliculasService = inject(PeliculasService);
  private programacionService = inject(ProgramacionService);

  // Los días van de 1 (lunes) a 7 (domingo), como los espera el servicio.
  diasSemanaOpciones = [
    { numero: 1, etiqueta: 'Lun' },
    { numero: 2, etiqueta: 'Mar' },
    { numero: 3, etiqueta: 'Mié' },
    { numero: 4, etiqueta: 'Jue' },
    { numero: 5, etiqueta: 'Vie' },
    { numero: 6, etiqueta: 'Sáb' },
    { numero: 7, etiqueta: 'Dom' },
  ];

  semanasOpciones = [1, 2, 3, 4];

  horariosSugeridos = ['15:00', '16:00', '18:00', '19:30', '21:00', '22:30'];

  peliculas = signal<PeliculaConCatalogo[]>([]);
  formatos = signal<{ id: number; codigo: string; nombre: string }[]>([]);
  versionesIdioma = signal<{ id: number; codigo: string; nombre: string }[]>([]);

  diasSeleccionados = signal([1, 2, 5]);
  semanasSeleccionadas = signal(1);
  formatoSeleccionado = signal<number | null>(null);
  versionIdiomaSeleccionada = signal<number | null>(null);
  fechaInicio = signal(this.aIso(new Date()));

  resumen = signal<ItemResumenProgramacion[]>([]);
  calculando = signal(false);
  guardando = signal(false);
  error = signal('');
  aviso = signal('');
  guardadoExitoso = false;

  form = this.fb.group({
    pelicula_id: ['', Validators.required],
    duracion_min: [120, [Validators.required, Validators.min(1)]],
    horarios: this.fb.array([this.fb.control('18:00', Validators.required)]),
  });

  get horariosArray() {
    const horarios = this.form.controls.horarios;

    return horarios;
  }

  funcionesAsignadasCount(): number {
    let cantidad = 0;

    for (const item of this.resumen()) {
      if (item.asignada && item.sala !== null) {
        cantidad = cantidad + 1;
      }
    }

    return cantidad;
  }

  funcionesRechazadas(): ItemResumenProgramacion[] {
    const rechazadas: ItemResumenProgramacion[] = [];

    for (const item of this.resumen()) {
      if (item.asignada === false || item.sala === null) {
        rechazadas.push(item);
      }
    }

    return rechazadas;
  }

  async ngOnInit(): Promise<void> {
    try {
      const [peliculas, formatos, idiomas] = await Promise.all([
        this.peliculasService.listar(),
        this.programacionService.obtenerFormatos(),
        this.programacionService.obtenerVersionesIdioma(),
      ]);

      const activas = peliculas.filter(estaActiva);
      this.peliculas.set(activas);
      this.formatos.set(formatos);
      this.versionesIdioma.set(idiomas);

      // Dejo elegida la primera opción de cada lista para que se pueda calcular de una.
      if (activas.length > 0) {
        const primera = activas[0];
        const duracion = duracionOPorDefecto(primera.duracion_min);
        this.form.controls.pelicula_id.setValue(primera.id);
        this.form.controls.duracion_min.setValue(duracion);
      }

      if (formatos.length > 0) {
        this.formatoSeleccionado.set(formatos[0].id);
      }

      if (idiomas.length > 0) {
        this.versionIdiomaSeleccionada.set(idiomas[0].id);
      }
    } catch (e) {
      const mensaje = mensajeDeError(e, 'Error al cargar datos iniciales');
      this.error.set(mensaje);
    }
  }

  noGuardado(): boolean {
    let bandera = false;

    if (this.guardadoExitoso) {
      bandera = false;
    } else if (this.form.dirty) {
      bandera = true;
    } else if (this.resumen().length > 0) {
      bandera = true;
    }

    return bandera;
  }

  onPeliculaChange(event: Event): void {
    const selector = event.target as HTMLSelectElement;
    const id = selector.value;
    const pelicula = buscarPelicula(this.peliculas(), id);

    if (pelicula !== undefined) {
      const duracion = duracionOPorDefecto(pelicula.duracion_min);
      this.form.controls.duracion_min.setValue(duracion);
      this.resumen.set([]);
    }
  }

  toggleDia(dia: number): void {
    const actuales = this.diasSeleccionados();

    if (actuales.includes(dia)) {
      const restantes: number[] = [];

      for (const actual of actuales) {
        if (actual !== dia) {
          restantes.push(actual);
        }
      }

      this.diasSeleccionados.set(restantes);
    } else {
      const nuevos = [...actuales, dia];
      nuevos.sort(ascendente);
      this.diasSeleccionados.set(nuevos);
    }

    this.resumen.set([]);
  }

  setSemanas(semanas: number): void {
    this.semanasSeleccionadas.set(semanas);
    this.resumen.set([]);
  }

  setFormato(formatoId: number): void {
    this.formatoSeleccionado.set(formatoId);
    this.error.set('');
  }

  setVersionIdioma(versionIdiomaId: number): void {
    this.versionIdiomaSeleccionada.set(versionIdiomaId);
    this.error.set('');
  }

  onFechaElegida(fecha: Date): void {
    const iso = this.aIso(fecha);
    this.fechaInicio.set(iso);
    this.resumen.set([]);
  }

  agregarHorario(hora = '18:00'): void {
    const yaEsta = this.horariosArray.value.includes(hora);

    if (yaEsta === false) {
      const control = this.fb.control(hora, Validators.required);
      this.horariosArray.push(control);
      this.resumen.set([]);
    }
  }

  quitarHorario(index: number): void {
    if (this.horariosArray.length > 1) {
      this.horariosArray.removeAt(index);
      this.resumen.set([]);
    }
  }

  async calcular(): Promise<void> {
    this.error.set('');
    this.aviso.set('');

    const peliculaId = this.form.controls.pelicula_id.value;
    const formatoId = this.formatoSeleccionado();
    const versionIdiomaId = this.versionIdiomaSeleccionada();
    const horarios = horariosCargados(this.horariosArray.value);

    if (peliculaId === '') {
      this.error.set('Elegí una película');
    } else if (formatoId === null || formatoId === 0) {
      this.error.set('Elegí un formato');
    } else if (versionIdiomaId === null || versionIdiomaId === 0) {
      this.error.set('Elegí un idioma');
    } else if (this.diasSeleccionados().length === 0) {
      this.error.set('Elegí al menos un día de la semana');
    } else if (horarios.length === 0) {
      this.error.set('Agregá al menos un horario');
    } else {
      await this.calcularConDatos(peliculaId, formatoId, versionIdiomaId, horarios);
    }
  }

  async programar(): Promise<void> {
    const formatoId = this.formatoSeleccionado();

    if (formatoId === null || formatoId === 0) {
      this.error.set('Elegí un formato');
    } else {
      if (this.resumen().length === 0) {
        await this.calcular();
      }

      if (this.funcionesAsignadasCount() === 0) {
        this.error.set('No hay funciones con sala disponible para crear');
      } else {
        await this.guardarProgramacion();
      }
    }
  }

  nombreFormato(): string {
    let codigo = '';

    for (const formato of this.formatos()) {
      if (codigo === '' && formato.id === this.formatoSeleccionado()) {
        codigo = formato.codigo;
      }
    }

    return codigo;
  }

  nombreIdioma(): string {
    let nombre = '';

    for (const idioma of this.versionesIdioma()) {
      if (nombre === '' && idioma.id === this.versionIdiomaSeleccionada()) {
        nombre = idioma.nombre;
      }
    }

    return nombre;
  }

  private async calcularConDatos(
    peliculaId: string,
    formatoId: number,
    versionIdiomaId: number,
    horarios: string[],
  ): Promise<void> {
    this.calculando.set(true);
    try {
      const duracionMin = duracionOPorDefecto(this.form.controls.duracion_min.value);

      const resultado = await this.programacionService.calcularProgramacion({
        peliculaId,
        duracionMin: duracionMin,
        fechaInicio: this.fechaInicio(),
        semanas: this.semanasSeleccionadas(),
        diasSemana: this.diasSeleccionados(),
        horarios,
        formatoId: formatoId,
        versionIdiomaId: versionIdiomaId,
      });

      this.resumen.set(resultado);
    } catch (e) {
      const mensaje = mensajeDeError(e, 'Error al calcular la programación');
      this.error.set(mensaje);
    } finally {
      this.calculando.set(false);
    }
  }

  private async guardarProgramacion(): Promise<void> {
    this.guardando.set(true);
    try {
      const duracionMin = duracionOPorDefecto(this.form.controls.duracion_min.value);

      const res = await this.programacionService.crearFunciones(
        this.resumen(),
        this.form.controls.pelicula_id.value,
        duracionMin,
        this.formatoSeleccionado()!,
        this.versionIdiomaSeleccionada()!,
      );

      this.guardadoExitoso = true;

      if (res.fallidas > 0) {
        this.error.set(
          `Se crearon ${res.creadas} funciones, pero fallaron ${res.fallidas}: ${res.errores.join(', ')}`,
        );
      } else {
        this.aviso.set(`Se crearon ${res.creadas} funciones exitosamente.`);
        // Espero un poco antes de volver al listado para que se llegue a leer el aviso.
        setTimeout(() => this.volverAlListado(), 1200);
      }
    } catch (e) {
      const mensaje = mensajeDeError(e, 'Error al guardar la programación');
      this.error.set(mensaje);
    } finally {
      this.guardando.set(false);
    }
  }

  private volverAlListado(): void {
    this.router.navigate(['/admin/funciones']);
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

function estaActiva(pelicula: PeliculaConCatalogo): boolean {
  let bandera = false;

  if (pelicula.activo && pelicula.estado !== 'archivada') {
    bandera = true;
  }

  return bandera;
}

function buscarPelicula(
  peliculas: PeliculaConCatalogo[],
  id: string,
): PeliculaConCatalogo | undefined {
  let encontrada: PeliculaConCatalogo | undefined = undefined;

  for (const pelicula of peliculas) {
    if (encontrada === undefined && pelicula.id === id) {
      encontrada = pelicula;
    }
  }

  return encontrada;
}

function horariosCargados(valores: string[]): string[] {
  const horarios: string[] = [];

  for (const valor of valores) {
    const horario = valor.trim();

    if (horario !== '') {
      horarios.push(horario);
    }
  }

  return horarios;
}

function ascendente(numeroA: number, numeroB: number): number {
  const diferencia = numeroA - numeroB;

  return diferencia;
}

function duracionOPorDefecto(duracion: number | null): number {
  let minutos = 120;

  if (duracion !== null && duracion !== 0 && Number.isNaN(duracion) === false) {
    minutos = duracion;
  }

  return minutos;
}
