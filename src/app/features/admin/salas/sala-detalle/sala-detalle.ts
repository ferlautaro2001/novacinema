import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalasService } from '../../../../core/data/salas-service';
import type { Sala } from '../../../../core/models/sala';
import { MapaButacasComponent } from '../../../../shared/ui/mapa-butacas/mapa-butacas';

@Component({
  selector: 'nc-sala-detalle',
  imports: [RouterLink, MapaButacasComponent],
  templateUrl: './sala-detalle.html',
  styleUrl: './sala-detalle.css',
})
export class SalaDetalle implements OnInit {
  private ruta = inject(ActivatedRoute);
  private salasService = inject(SalasService);

  sala = signal<Sala | null>(null);
  cargando = signal(true);
  error = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');

    if (id !== null && id !== '') {
      await this.cargarSala(id);
    } else {
      this.error.set('No se especificó la sala');
      this.cargando.set(false);
    }
  }

  private async cargarSala(id: string): Promise<void> {
    try {
      const sala = await this.salasService.buscar(id);
      if (sala !== null) {
        this.sala.set(sala);
      } else {
        this.error.set('No se encontró la sala');
      }
    } catch (e) {
      const mensaje = mensajeDeError(e);
      this.error.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function mensajeDeError(e: unknown): string {
  let mensaje = 'Error al cargar la sala';
  const error = e as { message?: string } | null | undefined;

  if (error !== null && error !== undefined) {
    if (error.message !== undefined && error.message !== '') {
      mensaje = error.message;
    }
  }

  return mensaje;
}
