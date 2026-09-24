import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService } from '../../../core/data/salas-service';
import type { Sala } from '../../../core/models/sala';

@Component({
  selector: 'nc-salas',
  imports: [RouterLink],
  templateUrl: './salas.html',
  styleUrl: './salas.css',
})
export class Salas implements OnInit {
  private salasService = inject(SalasService);

  salas = signal<Sala[]>([]);
  cargando = signal(true);
  cambiando = signal<string | null>(null);
  aviso = signal<string | null>(null);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.salas.set(await this.salasService.listar());
    } catch {
      this.error.set('No se pudo cargar el listado de salas. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarEstado(sala: Sala): Promise<void> {
    const nuevoEstado = !sala.activa;
    this.cambiando.set(sala.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      await this.salasService.activarSala(sala.id, nuevoEstado);
      this.salas.update((lista) =>
        lista.map((s) => (s.id === sala.id ? { ...s, activa: nuevoEstado } : s)),
      );
      this.aviso.set(
        nuevoEstado
          ? `${sala.nombre} activada. Ahora puede recibir funciones.`
          : `${sala.nombre} desactivada.`,
      );
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cambiando.set(null);
    }
  }
}
