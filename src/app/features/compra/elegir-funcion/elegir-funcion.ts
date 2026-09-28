import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuncionesService, type DiaDeFunciones } from '../../../core/data/funciones-service';
import { PeliculasService } from '../../../core/data/peliculas-service';
import type { FuncionParaComprar } from '../../../core/models/funcion';
import type { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { Cargando, type EstadoConsulta } from '../../../shared/directivas/cargando';
import { SelectorFecha } from '../../../shared/ui/selector-fecha/selector-fecha';
import { SelectorHora, type OpcionHora } from '../../../shared/ui/selector-hora/selector-hora';
import { aISO, fechaLarga, horaDe } from '../../../shared/utilidades/fechas';

// El primer paso de la compra: elegir día y horario de la película (US-07.01).
//
// Los dos selectores son los de US-01.05, que reemplazan al calendario. El de
// fechas recibe solo los días que tienen funciones, así que un día sin funciones
// no aparece. Al elegir un horario se va a /comprar/:funcionId, que es donde
// arranca la selección de butacas.
@Component({
  selector: 'nc-elegir-funcion',
  imports: [RouterLink, Cargando, SelectorFecha, SelectorHora],
  templateUrl: './elegir-funcion.html',
  styleUrl: './elegir-funcion.css',
})
export class ElegirFuncion implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);

  estado = signal<EstadoConsulta<DiaDeFunciones<FuncionParaComprar>>>({ tipo: 'cargando' });
  pelicula = signal<PeliculaConCatalogo | null>(null);
  dias = signal<DiaDeFunciones<FuncionParaComprar>[]>([]);
  diaElegido = signal<Date | null>(null);
  funcionesDelDia = signal<FuncionParaComprar[]>([]);

  // Los días que tienen funciones, como ISO, para que el selector de fechas no
  // ofrezca los que no sirven.
  diasDisponibles = computed(() => {
    const fechas: string[] = [];

    for (const dia of this.dias()) {
      fechas.push(aISO(dia.dia));
    }

    return fechas;
  });

  // Las opciones del selector de horarios, con la etiqueta que se ve:
  // "21:00 · 2D · Castellano". Las agotadas entran con su bandera.
  opciones = computed(() => {
    const lista: OpcionHora[] = [];

    for (const funcion of this.funcionesDelDia()) {
      const etiqueta = `${horaDe(funcion.comienzaEn)} · ${funcion.formato} · ${funcion.idioma}`;
      const opcion: OpcionHora = { id: funcion.id, etiqueta: etiqueta, agotada: funcion.agotada };

      lista.push(opcion);
    }

    return lista;
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('peliculaId');

    if (id === null || id === '') {
      this.marcarError();

      return;
    }

    this.estado.set({ tipo: 'cargando' });

    try {
      const pelicula = await this.peliculasService.buscar(id);
      const dias = await this.funcionesService.listarParaComprar(id);

      this.pelicula.set(pelicula);
      this.dias.set(dias);
      this.estado.set({ tipo: 'datos', datos: dias });

      if (dias.length !== 0) {
        this.elegirDia(dias[0].dia);
      }
    } catch {
      this.marcarError();
    }
  }

  elegirDia(dia: Date): void {
    this.diaElegido.set(dia);

    const funciones: FuncionParaComprar[] = [];

    for (const item of this.dias()) {
      if (item.dia.getTime() === dia.getTime()) {
        funciones.push(...item.funciones);
      }
    }

    this.funcionesDelDia.set(funciones);
  }

  elegirHorario(opcion: OpcionHora): void {
    this.router.navigate(['/comprar', opcion.id]);
  }

  // El día elegido arriba de los horarios. Usa fechaLarga y no el date pipe
  // porque la app no registra el locale: con el pipe el mes saldría en inglés.
  fechaLegible(dia: Date): string {
    const texto = fechaLarga(dia);

    return texto;
  }

  async recargar(): Promise<void> {
    await this.ngOnInit();
  }

  private marcarError(): void {
    this.estado.set({
      tipo: 'error',
      mensaje: 'No se pudieron cargar las funciones de la película. Probá de nuevo.',
    });
  }
}
