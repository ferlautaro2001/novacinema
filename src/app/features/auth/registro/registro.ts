import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
import { FormularioConCambios } from '../../../core/guards/cambios-pendientes-guard';
import { CampoFecha } from '../../../shared/ui/campo-fecha/campo-fecha';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import {
  ANIO_MINIMO,
  fechaPorPartes,
  isoDePartes,
} from '../../../shared/validadores/fecha-por-partes';

@Component({
  selector: 'nc-registro',
  imports: [ReactiveFormsModule, RouterLink, CampoFecha, CampoTexto, ErrorCampo],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro implements FormularioConCambios {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    nacimiento: this.fb.group(
      { dia: '', mes: '', anio: '' },
      { validators: fechaPorPartes({ soloAnteriorAHoy: true }) },
    ),
  });

  protected readonly anioMinimo = ANIO_MINIMO;
  protected readonly anioMaximo = new Date().getFullYear();

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly revisarEmail = signal(false);

  // Una vez creada la cuenta ya no hay nada que perder al salir.
  private cuentaCreada = false;

  noGuardado(): boolean {
    return this.form.dirty && !this.cuentaCreada;
  }

  protected async crearCuenta(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const datos = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.auth.registrarse({
        email: datos.email,
        clave: datos.clave,
        nombre: datos.nombre,
        apellido: datos.apellido,
        // fechaPorPartes ya garantizó que la fecha existe.
        fechaNacimiento: isoDePartes(datos.nacimiento),
      });
      this.cuentaCreada = true;
      if (resultado === 'sesion_iniciada') {
        await this.router.navigateByUrl('/inicio');
      } else {
        this.revisarEmail.set(true);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.enviando.set(false);
    }
  }
}
