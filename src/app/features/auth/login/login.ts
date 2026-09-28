import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    clave: ['', Validators.required],
  });

  enviando = signal(false);
  error = signal<string | null>(null);

  async ingresar(): Promise<void> {
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
      const rol = await this.auth.iniciarSesion(datos.email, datos.clave);
      const destino = this.destinoDespuesDeIngresar(inicioSegunRol(rol));
      await this.router.navigateByUrl(destino);
    } catch (excepcion) {
      const falla = excepcion as Error;
      this.error.set(falla.message);
      // Borro la contraseña para que no quede escrito el intento equivocado.
      this.form.controls.clave.reset();
    } finally {
      this.enviando.set(false);
    }
  }

  // Si sesionGuard lo mandó a ingresar, vuelve adonde iba (?volver=). Solo se
  // aceptan direcciones de la app: "/comprar/…" sí, "//otro-sitio" o
  // "https://…" no, para que nadie arme un link que después de ingresar lleve
  // a otra página.
  private destinoDespuesDeIngresar(inicio: string): string {
    const volver = this.route.snapshot.queryParamMap.get('volver');

    let destino = inicio;

    if (volver !== null && esDireccionInterna(volver)) {
      destino = volver;
    }

    return destino;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function esDireccionInterna(direccion: string): boolean {
  let interna = false;

  if (
    direccion.startsWith('/') &&
    direccion.startsWith('//') === false &&
    direccion.startsWith('/\\') === false
  ) {
    interna = true;
  }

  return interna;
}
