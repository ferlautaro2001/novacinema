import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { StorageService } from '../../../core/data/storage-service';
import { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { PeliculaCard } from '../../../shared/ui/pelicula-card/pelicula-card';
import { DetallePelicula } from '../detalle-pelicula/detalle-pelicula';
import { MasVendidas } from './mas-vendidas/mas-vendidas';

// Inicio: las más vendidas (US-06.01) y las destacadas (US-06.02).
@Component({
  selector: 'nc-inicio',
  imports: [PeliculaCard, DetallePelicula, MasVendidas],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private peliculas = inject(PeliculasService);
  storage = inject(StorageService);

  destacadas = signal<PeliculaConCatalogo[]>([]);
  detalleId = signal<string | null>(null);
  cargando = signal(true);
  error = signal(false);

  // La sección se muestra solo cuando terminó de cargar y hay al menos una destacada.
  hayDestacadas = computed(() => this.calcularHayDestacadas());

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);

    try {
      const peliculas = await this.peliculas.listar(true);
      this.destacadas.set(peliculas);
    } catch {
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────────────

  private calcularHayDestacadas(): boolean {
    let hayDestacadas = false;
    if (this.cargando() === false && this.error() === false) {
      if (this.destacadas().length > 0) {
        hayDestacadas = true;
      }
    }
    return hayDestacadas;
  }
}
