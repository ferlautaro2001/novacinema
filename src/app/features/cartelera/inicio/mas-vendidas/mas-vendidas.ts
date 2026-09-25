import { Component, inject, OnInit, output, signal } from '@angular/core';
import { RankingService } from '../../../../core/data/ranking-service';
import { StorageService } from '../../../../core/data/storage-service';
import type { PeliculaConCatalogo } from '../../../../core/models/pelicula';
import { PeliculaCard } from '../../../../shared/ui/pelicula-card/pelicula-card';

// Las 3 películas más vendidas (US-06.01). Avisa con el id cuál abrir en detalle.
@Component({
  selector: 'nc-mas-vendidas',
  imports: [PeliculaCard],
  templateUrl: './mas-vendidas.html',
  styleUrl: './mas-vendidas.css',
})
export class MasVendidas implements OnInit {
  private ranking = inject(RankingService);
  storage = inject(StorageService);

  verDetalle = output<string>();

  peliculas = signal<PeliculaConCatalogo[]>([]);
  cargando = signal(true);
  error = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);

    try {
      const masVendidas = await this.ranking.masVendidas();
      this.peliculas.set(masVendidas);
    } catch {
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  // "1.º más vista", "2.º más vista"…
  leyendaPuesto(indice: number): string {
    const leyenda = `${indice + 1}.º más vista`;

    return leyenda;
  }
}
