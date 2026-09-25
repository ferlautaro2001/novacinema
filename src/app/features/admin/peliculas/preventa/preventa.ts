import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../../../core/data/configuracion-service';
import { PeliculasService } from '../../../../core/data/peliculas-service';
import { PreventasService } from '../../../../core/data/preventas-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import { PeliculaConCatalogo } from '../../../../core/models/pelicula';
import { aperturaDeVenta } from '../../../../core/reglas/preventa';
import { CampoTexto } from '../../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../../shared/ui/error-campo/error-campo';

@Component({
  selector: 'nc-preventa',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CampoTexto, ErrorCampo],
  templateUrl: './preventa.html',
  styleUrl: './preventa.css',
})
export class Preventa implements OnInit, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private ruta = inject(ActivatedRoute);
  private peliculas = inject(PeliculasService);
  private preventas = inject(PreventasService);
  private configuracion = inject(ConfiguracionService);

  form = this.fb.group({
    habilitada: false,
    porcentaje: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(100),
      Validators.pattern(/^\d+$/),
    ]),
    dias_antes: this.fb.control<number | null>(7, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
  });

  pelicula = signal<PeliculaConCatalogo | null>(null);
  apertura = signal<Date | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  aviso = signal('');

  private id = this.ruta.snapshot.paramMap.get('id') ?? '';

  ngOnInit(): void {
    this.cargar();
  }

  noGuardado(): boolean {
    return this.form.dirty;
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [pelicula, preventa, diasDefecto] = await Promise.all([
        this.peliculas.buscar(this.id),
        this.preventas.buscar(this.id),
        this.configuracion.leer('dias_preventa_defecto'),
      ]);
      this.pelicula.set(pelicula);

      // Si la película no tiene preventa cargada, figura deshabilitada con los días por defecto.
      if (preventa) {
        this.form.setValue({
          habilitada: preventa.habilitada,
          porcentaje: preventa.porcentaje,
          dias_antes: preventa.dias_antes,
        });
      } else {
        this.form.setValue({
          habilitada: false,
          porcentaje: null,
          dias_antes: Number(diasDefecto) || 7,
        });
      }
      this.cambiarHabilitada();
      this.form.markAsPristine();
    } catch {
      this.error.set('No se pudo cargar la película. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Sin preventa el porcentaje no se usa, así que lo deshabilito y deja de validarse.
  cambiarHabilitada(): void {
    if (this.form.controls.habilitada.value) {
      this.form.controls.porcentaje.enable();
    } else {
      this.form.controls.porcentaje.disable();
    }
    this.calcularApertura();
  }

  calcularApertura(): void {
    const pelicula = this.pelicula();
    const { habilitada, dias_antes } = this.form.getRawValue();
    if (!pelicula || this.form.controls.dias_antes.invalid) {
      this.apertura.set(null);
      return;
    }
    this.apertura.set(
      aperturaDeVenta(pelicula.fecha_estreno, { habilitada, dias_antes: dias_antes ?? 0 }),
    );
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    try {
      const { habilitada, porcentaje, dias_antes } = this.form.getRawValue();
      await this.preventas.guardar({
        pelicula_id: this.id,
        habilitada,
        porcentaje: porcentaje ?? 0,
        dias_antes: dias_antes ?? 7,
      });
      this.form.markAsPristine();
      this.aviso.set('Preventa guardada');
    } catch {
      this.error.set('No se pudo guardar la preventa. Probá de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
