import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
import { AlertasService } from '../../../core/data/alertas-service';

// Botón "Avisarme" de Próximamente (US-06.08).
@Component({
  selector: 'nc-boton-alerta',
  imports: [RouterLink],
  templateUrl: './boton-alerta.html',
  styleUrl: './boton-alerta.css',
})
export class BotonAlerta {
  private auth = inject(AuthService);
  private alertas = inject(AlertasService);

  peliculaId = input.required<string>();
  titulo = input.required<string>();

  activa = signal(false);
  guardando = signal(false);
  pidioIngresar = signal(false);
  error = signal('');

  constructor() {
    // Cuando cambia la sesión o la película, vuelvo a leer si la alerta está activa.
    effect(() => this.leerEstado());
  }

  async alternar(): Promise<void> {
    const usuario = this.auth.usuario();

    if (usuario === null) {
      this.pidioIngresar.set(true);
    } else if (this.guardando() === false) {
      await this.guardar(usuario.id);
    }
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────

  private leerEstado(): void {
    const usuario = this.auth.usuario();
    const peliculaId = this.peliculaId();

    this.pidioIngresar.set(false);
    this.activa.set(false);

    if (usuario !== null) {
      this.cargarEstado(usuario.id, peliculaId);
    }
  }

  private async cargarEstado(usuarioId: string, peliculaId: string): Promise<void> {
    try {
      const activa = await this.alertas.estaActiva(usuarioId, peliculaId);
      this.activa.set(activa);
    } catch {
      this.error.set('No se pudo leer la alerta.');
    }
  }

  private async guardar(usuarioId: string): Promise<void> {
    this.guardando.set(true);
    this.error.set('');

    try {
      if (this.activa()) {
        await this.alertas.desactivar(usuarioId, this.peliculaId());
        this.activa.set(false);
      } else {
        await this.alertas.activar(usuarioId, this.peliculaId());
        this.activa.set(true);
      }
    } catch {
      this.error.set('No se pudo guardar la alerta. Probá de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
