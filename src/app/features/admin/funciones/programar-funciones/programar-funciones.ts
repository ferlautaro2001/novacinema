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
    return this.form.controls.horarios;
  }

  funcionesAsignadasCount(): number {
    return this.resumen().filter((i) => i.asignada && i.sala !== null).length;
  }

  funcionesRechazadas(): ItemResumenProgramacion[] {
    return this.resumen().filter((i) => !i.asignada || i.sala === null);
  }

  async ngOnInit(): Promise<void> {
    try {
      const [peliculas, formatos, idiomas] = await Promise.all([
        this.peliculasService.listar(),
        this.programacionService.obtenerFormatos(),
        this.programacionService.obtenerVersionesIdioma(),
      ]);

      const activas = peliculas.filter((p) => p.activo && p.estado !== 'archivada');
      this.peliculas.set(activas);
      this.formatos.set(formatos);
      this.versionesIdioma.set(idiomas);

      // Dejo elegida la primera opción de cada lista para que se pueda calcular de una.
      if (activas.length > 0) {
        this.form.controls.pelicula_id.setValue(activas[0].id);
        this.form.controls.duracion_min.setValue(activas[0].duracion_min || 120);
      }
      if (formatos.length > 0) {
        this.formatoSeleccionado.set(formatos[0].id);
      }
      if (idiomas.length > 0) {
        this.versionIdiomaSeleccionada.set(idiomas[0].id);
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Error al cargar datos iniciales');
    }
  }

  noGuardado(): boolean {
    if (this.guardadoExitoso) return false;
    return this.form.dirty || this.resumen().length > 0;
  }

  onPeliculaChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const pelicula = this.peliculas().find((p) => p.id === id);
    if (pelicula) {
      this.form.controls.duracion_min.setValue(pelicula.duracion_min || 120);
      this.resumen.set([]);
    }
  }

  toggleDia(dia: number): void {
    const actuales = this.diasSeleccionados();
    if (actuales.includes(dia)) {
      this.diasSeleccionados.set(actuales.filter((d) => d !== dia));
    } else {
      this.diasSeleccionados.set([...actuales, dia].sort((a, b) => a - b));
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
    this.fechaInicio.set(this.aIso(fecha));
    this.resumen.set([]);
  }

  agregarHorario(hora = '18:00'): void {
    if (!this.horariosArray.value.includes(hora)) {
      this.horariosArray.push(this.fb.control(hora, Validators.required));
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
    if (!peliculaId) {
      this.error.set('Elegí una película');
      return;
    }

    if (!this.formatoSeleccionado()) {
      this.error.set('Elegí un formato');
      return;
    }

    if (!this.versionIdiomaSeleccionada()) {
      this.error.set('Elegí un idioma');
      return;
    }

    if (this.diasSeleccionados().length === 0) {
      this.error.set('Elegí al menos un día de la semana');
      return;
    }

    const horarios = this.horariosArray.value.map((h) => h.trim()).filter((h) => h !== '');

    if (horarios.length === 0) {
      this.error.set('Agregá al menos un horario');
      return;
    }

    this.calculando.set(true);
    try {
      const resultado = await this.programacionService.calcularProgramacion({
        peliculaId,
        duracionMin: this.form.controls.duracion_min.value || 120,
        fechaInicio: this.fechaInicio(),
        semanas: this.semanasSeleccionadas(),
        diasSemana: this.diasSeleccionados(),
        horarios,
        formatoId: this.formatoSeleccionado()!,
        versionIdiomaId: this.versionIdiomaSeleccionada()!,
      });

      this.resumen.set(resultado);
    } catch (e: any) {
      this.error.set(e?.message || 'Error al calcular la programación');
    } finally {
      this.calculando.set(false);
    }
  }

  async programar(): Promise<void> {
    if (!this.formatoSeleccionado()) {
      this.error.set('Elegí un formato');
      return;
    }

    if (this.resumen().length === 0) {
      await this.calcular();
    }

    if (this.funcionesAsignadasCount() === 0) {
      this.error.set('No hay funciones con sala disponible para crear');
      return;
    }

    this.guardando.set(true);
    try {
      const res = await this.programacionService.crearFunciones(
        this.resumen(),
        this.form.controls.pelicula_id.value,
        this.form.controls.duracion_min.value || 120,
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
        setTimeout(() => this.router.navigate(['/admin/funciones']), 1200);
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Error al guardar la programación');
    } finally {
      this.guardando.set(false);
    }
  }

  nombreFormato(): string {
    const formato = this.formatos().find((f) => f.id === this.formatoSeleccionado());
    return formato?.codigo ?? '';
  }

  nombreIdioma(): string {
    const idioma = this.versionesIdioma().find((i) => i.id === this.versionIdiomaSeleccionada());
    return idioma?.nombre ?? '';
  }

  private aIso(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
