import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { Navegacion } from '../navegacion/navegacion';

@Component({
  selector: 'nc-encabezado',
  imports: [RouterLink, Navegacion],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css',
})
export class Encabezado {
  auth = inject(AuthService);
  private router = inject(Router);

  cerrando = signal(false);
  error = signal<string | null>(null);

  async cerrarSesion(): Promise<void> {
    this.cerrando.set(true);
    this.error.set(null);

    try {
      await this.auth.cerrarSesion();
      await this.router.navigateByUrl('/inicio');
    } catch (excepcion) {
      const falla = excepcion as Error;
      this.error.set(falla.message);
    } finally {
      this.cerrando.set(false);
    }
  }
}
