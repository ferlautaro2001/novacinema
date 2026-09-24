import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import { aISO, leerDDMMAAAA } from '../../../shared/utilidades/fechas';
import { fechaDDMMAAAA } from '../../../shared/validadores/fecha-ddmmaaaa';

@Component({
  selector: 'nc-registro',
  imports: [ReactiveFormsModule, RouterLink, CampoTexto, ErrorCampo],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    nacimiento: ['', [Validators.required, fechaDDMMAAAA({ soloAnteriorAHoy: true })]],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly revisarEmail = signal(false);

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
        // El validador ya garantizó que la fecha existe.
        fechaNacimiento: aISO(leerDDMMAAAA(datos.nacimiento)!),
      });
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
