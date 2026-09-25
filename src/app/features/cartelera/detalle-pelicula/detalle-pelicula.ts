import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Modal } from '../../../shared/ui/modal/modal';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';
import { Clasificacion } from '../../../shared/ui/clasificacion/clasificacion';
import { PuntajePipe } from '../../../shared/pipes/puntaje-pipe';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { StorageService } from '../../../core/data/storage-service';
import { FuncionesService, type DiaDeFunciones } from '../../../core/data/funciones-service';
import { ResenasService, type ResenaConAutor } from '../../../core/data/resenas-service';
import { nombreGenero, type PeliculaConCatalogo } from '../../../core/models/pelicula';
import { puntuacionPromedio } from '../../../core/reglas/puntuacion';
import { ResenasPelicula } from '../resenas-pelicula/resenas-pelicula';

const MENSAJE_NO_EXISTE = 'La película no existe o ya no está en cartelera';
const MENSAJE_ERROR = 'No pudimos cargar la película. Revisá tu conexión y probá de nuevo.';

type EstadoDetalle = 'cargando' | 'listo' | 'no-existe' | 'error';

// Modal con el detalle de una película (US-06.06). Lo abren la cartelera, Inicio y
// el enlace directo cartelera/:id.
@Component({
  selector: 'nc-detalle-pelicula',
  imports: [
    Modal,
    FocoInicial,
    Clasificacion,
    PuntajePipe,
    DuracionPipe,
    DatePipe,
    ResenasPelicula,
  ],
  templateUrl: './detalle-pelicula.html',
  styleUrl: './detalle-pelicula.css',
})
export class DetallePelicula {
  peliculaId = input.required<string>();
  cierre = output<void>();

  protected readonly mensajeNoExiste = MENSAJE_NO_EXISTE;
  protected readonly mensajeError = MENSAJE_ERROR;

  protected estado = signal<EstadoDetalle>('cargando');
  protected pelicula = signal<PeliculaConCatalogo | null>(null);
  protected portadaUrl = signal('');
  protected generos = signal<string[]>([]);
  protected puntuacion = signal<number | null>(null);
  protected dias = signal<DiaDeFunciones[]>([]);
  protected comentarios = signal<ResenaConAutor[]>([]);

  private peliculasService = inject(PeliculasService);
  private storageService = inject(StorageService);
  private funcionesService = inject(FuncionesService);
  private resenasService = inject(ResenasService);

  // Cuenta las cargas pedidas: si el id cambia mientras cargo, descarto la anterior.
  private pedido = 0;

  constructor() {
    effect(() => this.cargarDetalle());
  }

  private async cargarDetalle(): Promise<void> {
    const id = this.peliculaId();
    this.pedido = this.pedido + 1;
    const pedidoActual = this.pedido;

    this.estado.set('cargando');
    this.pelicula.set(null);

    let estadoFinal: EstadoDetalle = 'listo';

    try {
      const pelicula = await this.buscarPelicula(id);

      if (pelicula === null) {
        estadoFinal = 'no-existe';
      } else {
        const dias = await this.funcionesService.listarEnVentaPorDia(id, pelicula.fecha_estreno);
        const resenas = await this.resenasService.listarDePelicula(id);

        if (pedidoActual === this.pedido) {
          this.mostrar(pelicula, dias, resenas);
        }
      }
    } catch {
      estadoFinal = 'error';
    }

    if (pedidoActual === this.pedido) {
      this.estado.set(estadoFinal);
    }
  }

  // null si no existe, está inactiva o archivada. Un id mal formado cuenta como inexistente.
  private async buscarPelicula(id: string): Promise<PeliculaConCatalogo | null> {
    let encontrada: PeliculaConCatalogo | null = null;

    try {
      const pelicula = await this.peliculasService.buscar(id);

      if (pelicula.activo === true && pelicula.estado !== 'archivada') {
        encontrada = pelicula;
      }
    } catch (error) {
      if (esNoEncontrada(error) === false) {
        throw error;
      }
    }

    return encontrada;
  }

  private mostrar(
    pelicula: PeliculaConCatalogo,
    dias: DiaDeFunciones[],
    resenas: ResenaConAutor[],
  ): void {
    const portadaUrl = this.storageService.urlPublica(pelicula.imagen_path);
    const generos: string[] = [];
    const estrellas: number[] = [];
    const comentarios: ResenaConAutor[] = [];

    for (const relacion of pelicula.pelicula_generos) {
      const nombre = nombreGenero(relacion.genero.nombre);
      generos.push(nombre);
    }

    for (const resena of resenas) {
      estrellas.push(resena.estrellas);

      if (tieneComentario(resena)) {
        comentarios.push(resena);
      }
    }

    const puntuacion = puntuacionPromedio(estrellas);

    this.pelicula.set(pelicula);
    this.portadaUrl.set(portadaUrl);
    this.generos.set(generos);
    this.puntuacion.set(puntuacion);
    this.dias.set(dias);
    this.comentarios.set(comentarios);
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// PGRST116: .single() sin filas. 22P02: el id no es un uuid válido.
function esNoEncontrada(error: unknown): boolean {
  let noEncontrada = false;

  if (error !== null && typeof error === 'object') {
    const datos = error as { code?: string };

    if (datos.code === 'PGRST116') {
      noEncontrada = true;
    } else if (datos.code === '22P02') {
      noEncontrada = true;
    }
  }

  return noEncontrada;
}

function tieneComentario(resena: ResenaConAutor): boolean {
  let tiene = false;

  if (resena.comentario !== null && resena.comentario.trim() !== '') {
    tiene = true;
  }

  return tiene;
}
