import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService, errorPelicula } from '../../../../core/data/peliculas-service';
import { StorageService } from '../../../../core/data/storage-service';
import { nombreGenero, PeliculaConCatalogo } from '../../../../core/models/pelicula';
import { Cargando, EstadoConsulta } from '../../../../shared/directivas/cargando';
import { FocoInicial } from '../../../../shared/directivas/foco-inicial';
import { DuracionPipe } from '../../../../shared/pipes/duracion-pipe';
import { TextoLargoPipe } from '../../../../shared/pipes/texto-largo-pipe';
import { Clasificacion } from '../../../../shared/ui/clasificacion/clasificacion';
import { Modal } from '../../../../shared/ui/modal/modal';
import { TablaDatos } from '../../../../shared/ui/tabla-datos/tabla-datos';

@Component({
  selector: 'nc-peliculas',
  imports: [
    RouterLink,
    DatePipe,
    Cargando,
    FocoInicial,
    DuracionPipe,
    TextoLargoPipe,
    Clasificacion,
    Modal,
    TablaDatos,
  ],
  templateUrl: './peliculas.html',
  styleUrl: './peliculas.css',
})
export class Peliculas implements OnInit {
  private servicio = inject(PeliculasService);
  storage = inject(StorageService);
  estado = signal<EstadoConsulta<PeliculaConCatalogo>>({ tipo: 'cargando' });
  confirmacion = signal<PeliculaConCatalogo | null>(null);
  trabajando = signal(false);
  error = signal('');
  aviso = signal(history.state?.peliculaGuardada ?? '');
  estados = {
    proximamente: 'Próximamente',
    en_cartelera: 'En cartelera',
    archivada: 'Finalizada',
  };

  ngOnInit(): void {
    void this.cargar();
  }
  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });
    try {
      this.estado.set({ tipo: 'datos', datos: await this.servicio.listar() });
    } catch {
      this.estado.set({ tipo: 'error', mensaje: 'No se pudo cargar el catálogo. Probá de nuevo.' });
    }
  }
  generos(p: PeliculaConCatalogo): string {
    return p.pelicula_generos.map((g) => nombreGenero(g.genero.nombre)).join(', ');
  }
  nombreEstado(p: PeliculaConCatalogo): string {
    return this.estados[p.estado];
  }
  async accion(
    tipo: 'destacar' | 'finalizar' | 'eliminar',
    p: PeliculaConCatalogo,
  ): Promise<void> {
    if (this.trabajando()) return;
    this.trabajando.set(true);
    this.error.set('');
    this.aviso.set('');
    try {
      await this.servicio[tipo](p);
      this.confirmacion.set(null);
      this.aviso.set(
        tipo === 'eliminar'
          ? 'Película eliminada'
          : tipo === 'finalizar'
            ? 'Película finalizada'
            : 'Destacadas actualizadas',
      );
      await this.cargar();
    } catch (e) {
      this.confirmacion.set(null);
      this.error.set(errorPelicula(e));
    } finally {
      this.trabajando.set(false);
    }
  }
}
