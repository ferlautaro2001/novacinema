import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CuponesService } from '../../../../core/data/cupones-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import { CampoTexto } from '../../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../../shared/ui/error-campo/error-campo';
import { SelectorFecha } from '../../../../shared/ui/selector-fecha/selector-fecha';
import { aISO } from '../../../../shared/utilidades/fechas';
import { finNoAnterior } from './vigencia';

@Component({
  selector: 'nc-nuevo-cupon',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CampoTexto, ErrorCampo, SelectorFecha],
  templateUrl: './nuevo-cupon.html',
  styleUrl: './nuevo-cupon.css',
})
export class NuevoCupon implements OnInit, OnDestroy, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private cupones = inject(CuponesService);
  private router = inject(Router);

  form = this.fb.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{4,12}$/)]],
      porcentaje: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(1),
        Validators.max(100),
        Validators.pattern(/^\d+$/),
      ]),
      vigente_desde: ['', Validators.required],
      vigente_hasta: ['', Validators.required],
    },
    { validators: finNoAnterior },
  );

  guardando = signal(false);
  error = signal('');

  private guardado = false;
  private suscripcion?: Subscription;

  ngOnInit(): void {
    // El código se guarda en mayúsculas: lo paso a mayúsculas mientras el admin escribe.
    // No uso emitEvent: false porque el campo tiene que enterarse para actualizar sus errores.
    const codigo = this.form.controls.codigo;
    this.suscripcion = codigo.valueChanges.subscribe((valor) => {
      const mayusculas = valor.toUpperCase();
      if (mayusculas !== valor) {
        codigo.setValue(mayusculas);
      }
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  noGuardado(): boolean {
    return this.form.dirty && !this.guardado;
  }

  elegirDesde(fecha: Date): void {
    this.form.controls.vigente_desde.setValue(aISO(fecha));
    this.form.controls.vigente_desde.markAsDirty();
  }

  elegirHasta(fecha: Date): void {
    this.form.controls.vigente_hasta.setValue(aISO(fecha));
    this.form.controls.vigente_hasta.markAsDirty();
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { codigo, porcentaje, vigente_desde, vigente_hasta } = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set('');
    try {
      // En la base la vigencia es un momento: va desde el primer minuto del día de
      // inicio hasta el último del día de fin.
      await this.cupones.crear({
        codigo,
        tipo: 'edad_minima',
        edad_minima: 51,
        porcentaje: Number(porcentaje),
        vigente_desde: new Date(vigente_desde + 'T00:00:00').toISOString(),
        vigente_hasta: new Date(vigente_hasta + 'T23:59:59').toISOString(),
      });
      this.guardado = true;
      await this.router.navigateByUrl('/admin/cupones');
    } catch (e) {
      if (e instanceof Error && e.message === 'Ese código ya existe') {
        this.form.controls.codigo.setErrors({ repetido: true });
      } else {
        this.error.set('No se pudo guardar el cupón. Revisá la conexión y volvé a intentarlo.');
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
