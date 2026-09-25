import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CuponesService } from '../../../../core/data/cupones-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import { Cupon } from '../../../../core/models/precio';
import { CampoTexto } from '../../../../shared/ui/campo-texto/campo-texto';

// Uso un solo mensaje para cualquier error: nc-campo-texto lo muestra cuando el campo queda inválido.
function entero(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === '') return null;
  return Number.isInteger(control.value) ? null : { entero: true };
}

@Component({
  selector: 'nc-primera-compra',
  imports: [ReactiveFormsModule, RouterLink, CampoTexto],
  templateUrl: './primera-compra.html',
  styleUrl: './primera-compra.css',
})
export class PrimeraCompra implements OnInit, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private cuponesS = inject(CuponesService);

  formulario = this.fb.group({
    porcentaje: [0, [Validators.required, Validators.min(1), Validators.max(50), entero]],
  });

  cupon = signal<Cupon | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  aviso = signal('');
  error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const cupon = await this.cuponesS.primeraCompra();
      this.cupon.set(cupon);
      this.formulario.setValue({ porcentaje: cupon.porcentaje });
    } catch {
      this.error.set('No se pudo cargar el cupón de primera compra. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  noGuardado(): boolean {
    return this.formulario.dirty;
  }

  async guardar(): Promise<void> {
    const cupon = this.cupon();
    this.formulario.markAllAsTouched();
    if (!cupon || this.formulario.invalid) return;

    const porcentaje = this.formulario.getRawValue().porcentaje;
    this.guardando.set(true);
    this.aviso.set('');
    this.error.set('');
    try {
      await this.cuponesS.cambiarPorcentaje(cupon.id, porcentaje);
      this.cupon.set({ ...cupon, porcentaje });
      // Lo marco como limpio para que el guard no pregunte al salir.
      this.formulario.markAsPristine();
      this.aviso.set(`Listo, el cupón ${cupon.codigo} ahora descuenta ${porcentaje} %.`);
    } catch {
      this.error.set('No se pudo guardar el porcentaje. Probá de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
