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
  // Si vengo del formulario, el mensaje de guardado viaja en el state de la navegación.
  aviso = signal(avisoGuardado());

  estados = {
    proximamente: 'Próximamente',
    en_cartelera: 'En cartelera',
    archivada: 'Finalizada',
  };

  // Textos del aviso que queda arriba de la tabla después de cada acción.
  avisos = {
    destacar: 'Destacadas actualizadas',
    finalizar: 'Película finalizada',
    eliminar: 'Película eliminada',
  };

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });

    try {
      const peliculas = await this.servicio.listar();

      this.estado.set({ tipo: 'datos', datos: peliculas });
    } catch {
      this.estado.set({ tipo: 'error', mensaje: 'No se pudo cargar el catálogo. Probá de nuevo.' });
    }
  }

  generos(pelicula: PeliculaConCatalogo): string {
    const nombres: string[] = [];

    for (const peliculaGenero of pelicula.pelicula_generos) {
      const nombre = nombreGenero(peliculaGenero.genero.nombre);

      nombres.push(nombre);
    }

    const lista = nombres.join(', ');

    return lista;
  }

  nombreEstado(pelicula: PeliculaConCatalogo): string {
    const nombre = this.estados[pelicula.estado];

    return nombre;
  }

  async accion(
    tipo: 'destacar' | 'finalizar' | 'eliminar',
    pelicula: PeliculaConCatalogo,
  ): Promise<void> {
    if (this.trabajando() === false) {
      this.trabajando.set(true);
      this.error.set('');
      this.aviso.set('');

      try {
        await this.servicio[tipo](pelicula);
        this.confirmacion.set(null);

        const mensaje = this.avisos[tipo];

        this.aviso.set(mensaje);
        await this.cargar();
      } catch (excepcion) {
        this.confirmacion.set(null);

        const mensajeError = errorPelicula(excepcion);

        this.error.set(mensajeError);
      } finally {
        this.trabajando.set(false);
      }
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function avisoGuardado(): string {
  let aviso = '';

  const estadoNavegacion = history.state;

  if (estadoNavegacion !== null && estadoNavegacion !== undefined) {
    const peliculaGuardada = estadoNavegacion.peliculaGuardada;

    if (peliculaGuardada !== null && peliculaGuardada !== undefined) {
      aviso = peliculaGuardada;
    }
  }

  return aviso;
}
