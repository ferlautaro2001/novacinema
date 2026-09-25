import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { StorageService } from '../../../core/data/storage-service';
import { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { PeliculaCard } from '../../../shared/ui/pelicula-card/pelicula-card';
import { Modal } from '../../../shared/ui/modal/modal';
import { Clasificacion } from '../../../shared/ui/clasificacion/clasificacion';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';

// Por ahora Inicio muestra solo las películas destacadas.
@Component({
  selector: 'nc-inicio',
  imports: [PeliculaCard, Modal, Clasificacion, DatePipe, DuracionPipe, FocoInicial],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private peliculas = inject(PeliculasService);
  storage = inject(StorageService);

  destacadas = signal<PeliculaConCatalogo[]>([]);
  detalle = signal<PeliculaConCatalogo | null>(null);
  cargando = signal(true);
  error = signal(false);

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
}
