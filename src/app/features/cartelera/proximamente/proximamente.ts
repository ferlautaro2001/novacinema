import { Component, inject, OnInit, signal } from '@angular/core';
import { ProximamenteService } from '../../../core/data/proximamente-service';
import { StorageService } from '../../../core/data/storage-service';
import { nombreGenero, PeliculaConCatalogo } from '../../../core/models/pelicula';
import { diaDeEstreno } from '../../../core/reglas/preventa';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { PeliculaCard } from '../../../shared/ui/pelicula-card/pelicula-card';
import { BotonAlerta } from '../boton-alerta/boton-alerta';
import { DetallePelicula } from '../detalle-pelicula/detalle-pelicula';

// Estrenos de las próximas 4 semanas que todavía no están a la venta (US-06.07).
@Component({
  selector: 'nc-proximamente',
  imports: [Cargando, PeliculaCard, BotonAlerta, DetallePelicula],
  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css',
})
export class Proximamente implements OnInit {
  private proximamente = inject(ProximamenteService);
  storage = inject(StorageService);

  estado = signal<EstadoConsulta<PeliculaConCatalogo>>({ tipo: 'cargando' });
  detalleId = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });

    try {
      const peliculas = await this.proximamente.listarProximamente();
      this.estado.set({ tipo: 'datos', datos: peliculas });
    } catch {
      this.estado.set({
        tipo: 'error',
        mensaje: 'No se pudieron cargar los estrenos. Probá de nuevo.',
      });
    }
  }

  generos(pelicula: PeliculaConCatalogo): string[] {
    const nombres: string[] = [];

    for (const relacion of pelicula.pelicula_generos) {
      const nombre = nombreGenero(relacion.genero.nombre);

      if (nombres.includes(nombre) === false) {
        nombres.push(nombre);
      }
    }

    return nombres;
  }

  // "Estreno: jueves 22/10", en hora local.
  leyenda(pelicula: PeliculaConCatalogo): string {
    const estreno = diaDeEstreno(pelicula.fecha_estreno);
    const diaSemana = estreno.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
    const dia = String(estreno.getDate()).padStart(2, '0');
    const mes = String(estreno.getMonth() + 1).padStart(2, '0');

    const texto = `Estreno: ${diaSemana} ${dia}/${mes}`;

    return texto;
  }
}
