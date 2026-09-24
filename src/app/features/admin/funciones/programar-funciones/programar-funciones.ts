import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PeliculasService } from '../../../../core/data/peliculas-service';
import {
  ItemResumenProgramacion,
  ProgramacionService,
} from '../../../../core/data/programacion-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import type { PeliculaConCatalogo } from '../../../../core/models/pelicula';
import { SelectorFecha } from '../../../../shared/ui/selector-fecha/selector-fecha';

export interface DiaOpcion {
  numero: number; // 1=Lun ... 7=Dom
  etiqueta: string;
}

@Component({
  selector: 'nc-programar-funciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SelectorFecha],
  templateUrl: './programar-funciones.html',
  styleUrl: './programar-funciones.css',
})
export class ProgramarFunciones implements OnInit, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private router = inject(Router);
  private peliculasService = inject(PeliculasService);
  private programacionService = inject(ProgramacionService);

  diasSemanaOpciones: DiaOpcion[] = [
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

  diasSeleccionados = signal<number[]>([1, 2, 5]); // Por defecto Lun, Mar, Vie
  semanasSeleccionadas = signal<number>(1);
  formatoSeleccionado = signal<number | null>(null);
  versionIdiomaSeleccionada = signal<number | null>(null);
  fechaInicio = signal<string>(this.obtenerHoyIso());

  resumen = signal<ItemResumenProgramacion[]>([]);
  calculando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  error = signal<string>('');
  aviso = signal<string>('');
  guardadoExitoso = false;

  form = this.fb.group({
    pelicula_id: ['', Validators.required],
    duracion_min: [120, [Validators.required, Validators.min(1)]],
    horarios: this.fb.array([this.fb.control('18:00', Validators.required)]),
  });

  get horariosArray(): FormArray {
    return this.form.get('horarios') as FormArray;
  }

  peliculaSeleccionada(): PeliculaConCatalogo | null {
    const id = this.form.controls.pelicula_id.value;
    return this.peliculas().find((p) => p.id === id) || null;
  }

  funcionesAsignadasCount(): number {
    return this.resumen().filter((i) => i.asignada && i.sala !== null).length;
  }

  funcionesRechazadas(): ItemResumenProgramacion[] {
    return this.resumen().filter((i) => !i.asignada || i.sala === null);
  }

  async ngOnInit(): Promise<void> {
    try {
      const [pelis, fmts, idms] = await Promise.all([
        this.peliculasService.listar(),
        this.programacionService.obtenerFormatos(),
        this.programacionService.obtenerVersionesIdioma(),
      ]);

      const activas = pelis.filter((p) => p.activo && p.estado !== 'archivada');
      this.peliculas.set(activas);
      this.formatos.set(fmts);
      this.versionesIdioma.set(idms);

      if (activas.length > 0) {
        this.form.controls.pelicula_id.setValue(activas[0].id);
        this.form.controls.duracion_min.setValue(activas[0].duracion_min || 120);
      }
      if (fmts.length > 0) {
        this.formatoSeleccionado.set(fmts[0].id);
      }
      if (idms.length > 0) {
        this.versionIdiomaSeleccionada.set(idms[0].id);
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
    const select = event.target as HTMLSelectElement;
    const pelicula = this.peliculas().find((p) => p.id === select.value);
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
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    this.fechaInicio.set(`${y}-${m}-${d}`);
    this.resumen.set([]);
  }

  agregarHorario(hora: string = '18:00'): void {
    if (!this.horariosArray.controls.some((c) => c.value === hora)) {
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

    const horarios = this.horariosArray.controls
      .map((c) => c.value?.trim())
      .filter((h): h is string => !!h);

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

    const aCrear = this.resumen().filter((i) => i.asignada && i.sala !== null);
    if (aCrear.length === 0) {
      this.error.set('No hay funciones con sala disponible para crear');
      return;
    }

    this.guardando.set(true);
    try {
      const peliculaId = this.form.controls.pelicula_id.value;
      const duracionMin = this.form.controls.duracion_min.value || 120;
      const formatoId = this.formatoSeleccionado()!;
      const versionIdiomaId = this.versionIdiomaSeleccionada()!;

      const res = await this.programacionService.crearFunciones(
        this.resumen(),
        peliculaId,
        duracionMin,
        formatoId,
        versionIdiomaId
      );

      this.guardadoExitoso = true;
      if (res.fallidas > 0) {
        this.error.set(
          `Se crearon ${res.creadas} funciones, pero fallaron ${res.fallidas}: ${res.errores.join(', ')}`
        );
      } else {
        this.aviso.set(`Se crearon ${res.creadas} funciones exitosamente.`);
        setTimeout(() => {
          this.router.navigate(['/admin/funciones']);
        }, 1200);
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Error al guardar la programación');
    } finally {
      this.guardando.set(false);
    }
  }

  nombreFormato(): string {
    const f = this.formatos().find((x) => x.id === this.formatoSeleccionado());
    return f ? f.codigo : '';
  }

  nombreIdioma(): string {
    const i = this.versionesIdioma().find(
      (x) => x.id === this.versionIdiomaSeleccionada()
    );
    return i ? i.nombre : '';
  }

  private obtenerHoyIso(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
