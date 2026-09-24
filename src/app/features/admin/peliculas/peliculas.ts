import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService, errorPelicula } from '../../../core/data/peliculas-service';
import { StorageService } from '../../../core/data/storage-service';
import { nombreGenero, PeliculaConCatalogo } from '../../../core/models/pelicula';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { TextoLargoPipe } from '../../../shared/pipes/texto-largo-pipe';
import { Clasificacion } from '../../../shared/ui/clasificacion/clasificacion';
import { TablaDatos } from '../../../shared/ui/tabla-datos/tabla-datos';

@Component({
  selector: 'nc-peliculas',
  imports: [
    RouterLink,
    DatePipe,
    Cargando,
    DuracionPipe,
    TextoLargoPipe,
    Clasificacion,
    TablaDatos,
  ],
  templateUrl: './peliculas.html',
  styleUrl: './peliculas.css',
})
export class Peliculas implements OnInit {
  private readonly servicio = inject(PeliculasService);
  protected readonly storage = inject(StorageService);
  protected readonly estado = signal<EstadoConsulta<PeliculaConCatalogo>>({ tipo: 'cargando' });
  protected readonly error = signal('');
  protected readonly aviso = signal(history.state?.peliculaGuardada ?? '');
  protected readonly estados = {
    proximamente: 'Próximamente',
    en_cartelera: 'En cartelera',
    archivada: 'Finalizada',
  };

  ngOnInit(): void {
    void this.cargar();
  }
  protected async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });
    try {
      this.estado.set({ tipo: 'datos', datos: await this.servicio.listar() });
    } catch {
      this.estado.set({ tipo: 'error', mensaje: 'No se pudo cargar el catálogo. Probá de nuevo.' });
    }
  }
  protected generos(p: PeliculaConCatalogo): string {
    return p.pelicula_generos.map((g) => nombreGenero(g.genero.nombre)).join(', ');
  }
  protected nombreEstado(p: PeliculaConCatalogo): string {
    return this.estados[p.estado];
  }
}
