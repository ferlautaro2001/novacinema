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
  private auth = inject(AuthService);
  private router = inject(Router);

  private fb = inject(FormBuilder).nonNullable;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', [Validators.required, Validators.minLength(6)]],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    nacimiento: this.fb.group(
      { dia: '', mes: '', anio: '' },
      { validators: fechaPorPartes({ soloAnteriorAHoy: true }) },
    ),
  });

  anioMinimo = ANIO_MINIMO;
  anioMaximo = new Date().getFullYear();

  enviando = signal(false);
  error = signal<string | null>(null);
  revisarEmail = signal(false);

  // Una vez creada la cuenta ya no hay nada que perder al salir.
  private cuentaCreada = false;

  noGuardado(): boolean {
    let bandera = false;

    if (this.form.dirty && this.cuentaCreada === false) {
      bandera = true;
    }

    return bandera;
  }

  async crearCuenta(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
    } else {
      await this.enviar();
    }
  }

  private async enviar(): Promise<void> {
    const datos = this.form.getRawValue();

    this.enviando.set(true);
    this.error.set(null);

    try {
      // fechaPorPartes ya garantizó que la fecha existe.
      const fechaNacimiento = isoDePartes(datos.nacimiento);
      const resultado = await this.auth.registrarse({
        email: datos.email,
        clave: datos.clave,
        nombre: datos.nombre,
        apellido: datos.apellido,
        fechaNacimiento: fechaNacimiento,
      });
      this.cuentaCreada = true;

      if (resultado === 'sesion_iniciada') {
        await this.router.navigateByUrl('/inicio');
      } else {
        this.revisarEmail.set(true);
      }
    } catch (excepcion) {
      const falla = excepcion as Error;
      this.error.set(falla.message);
    } finally {
      this.enviando.set(false);
    }
  }
}
