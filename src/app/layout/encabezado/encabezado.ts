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
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cerrando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Al salir se vuelve a Inicio como visitante.
  protected async cerrarSesion(): Promise<void> {
    this.cerrando.set(true);
    this.error.set(null);
    try {
      await this.auth.cerrarSesion();
      await this.router.navigateByUrl('/inicio');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cerrando.set(false);
    }
  }
}
