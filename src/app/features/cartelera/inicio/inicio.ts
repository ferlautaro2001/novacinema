import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { PeliculaCard } from '../../../shared/ui/pelicula-card/pelicula-card';
import { Modal } from '../../../shared/ui/modal/modal';
import { Clasificacion } from '../../../shared/ui/clasificacion/clasificacion';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';

// EP-03 conecta solo las destacadas. Búsqueda, funciones y ventas llegan en EP-06.
@Component({
  selector: 'nc-inicio',
  imports: [PeliculaCard, Modal, Clasificacion, DatePipe, DuracionPipe, FocoInicial],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private readonly peliculas = inject(PeliculasService);
  protected readonly destacadas = signal<PeliculaConCatalogo[]>([]);
  protected readonly detalle = signal<PeliculaConCatalogo | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  ngOnInit(): void {
    void this.cargar();
  }
  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);
    try {
      this.destacadas.set(await this.peliculas.listar(true));
    } catch {
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }
}
