import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarteleraService } from '../../../core/data/cartelera-service';
import { StorageService } from '../../../core/data/storage-service';
import { PeliculaEnCartelera } from '../../../core/models/pelicula';
import { PeliculaCard } from '../../../shared/ui/pelicula-card/pelicula-card';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { FiltroPeliculasPipe } from '../../../shared/pipes/filtro-peliculas-pipe';
import { DetallePelicula } from '../detalle-pelicula/detalle-pelicula';
import { BuscadorPeliculas } from './buscador-peliculas/buscador-peliculas';
import { FiltroGeneros } from './filtro-generos/filtro-generos';

// Cartelera pública: cards (US-06.03), buscador (US-06.04) y filtro por género (US-06.05).
@Component({
  selector: 'nc-listado',
  imports: [
    Cargando,
    PeliculaCard,
    FiltroPeliculasPipe,
    DetallePelicula,
    BuscadorPeliculas,
    FiltroGeneros,
  ],
  templateUrl: './listado.html',
  styleUrl: './listado.css',
})
export class Listado implements OnInit {
  private cartelera = inject(CarteleraService);
  storage = inject(StorageService);

  peliculas = signal<PeliculaEnCartelera[]>([]);
  estado = signal<EstadoConsulta<PeliculaEnCartelera>>({ tipo: 'cargando' });
  texto = signal('');
  genero = signal('');
  detalleId = signal<string | null>(null);
  generosDisponibles = computed(() => this.calcularGeneros());

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });

    try {
      const peliculas = await this.cartelera.listarEnCartelera();

      this.peliculas.set(peliculas);
      this.estado.set({ tipo: 'datos', datos: peliculas });
    } catch {
      this.estado.set({
        tipo: 'error',
        mensaje: 'No se pudo cargar la cartelera. Probá de nuevo.',
      });
    }
  }

  // Los géneros de las películas en cartelera, sin repetir y en orden alfabético.
  private calcularGeneros(): string[] {
    const generos: string[] = [];

    for (const pelicula of this.peliculas()) {
      for (const genero of pelicula.generos) {
        if (generos.includes(genero) === false) {
          generos.push(genero);
        }
      }
    }

    generos.sort(compararTexto);

    return generos;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function compararTexto(primero: string, segundo: string): number {
  const orden = primero.localeCompare(segundo, 'es');

  return orden;
}
