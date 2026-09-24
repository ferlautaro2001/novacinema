import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, inicioSegunRol } from '../../../core/auth/auth-service';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';

@Component({
  selector: 'nc-login',
  imports: [ReactiveFormsModule, RouterLink, CampoTexto, ErrorCampo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', Validators.required],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, clave } = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const rol = await this.auth.iniciarSesion(email, clave);
      await this.router.navigateByUrl(inicioSegunRol(rol));
    } catch (e) {
      this.error.set((e as Error).message);
      // Se borra la contraseña para que no quede el intento equivocado escrito.
      this.form.controls.clave.reset();
    } finally {
      this.enviando.set(false);
    }
  }
}
