import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService } from '../../../../core/data/salas-service';
import type { Sala } from '../../../../core/models/sala';

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
      const lista = await this.salasService.listar();
      this.salas.set(lista);
    } catch {
      this.error.set('No se pudo cargar el listado de salas. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarEstado(sala: Sala): Promise<void> {
    let nuevoEstado = false;

    if (sala.activa === false) {
      nuevoEstado = true;
    }

    this.cambiando.set(sala.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      await this.salasService.activarSala(sala.id, nuevoEstado);
      const lista = salasConEstado(this.salas(), sala.id, nuevoEstado);
      this.salas.set(lista);
      if (nuevoEstado) {
        this.aviso.set(`${sala.nombre} activada. Ahora puede recibir funciones.`);
      } else {
        this.aviso.set(`${sala.nombre} desactivada.`);
      }
    } catch (e) {
      const error = e as Error;
      this.error.set(error.message);
    } finally {
      this.cambiando.set(null);
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function salasConEstado(lista: Sala[], id: string, activa: boolean): Sala[] {
  const salas: Sala[] = [];

  for (const sala of lista) {
    if (sala.id === id) {
      salas.push({ ...sala, activa: activa });
    } else {
      salas.push(sala);
    }
  }

  return salas;
}
