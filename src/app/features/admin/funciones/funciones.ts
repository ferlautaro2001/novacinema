import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProgramacionService } from '../../../core/data/programacion-service';
import { SalasService } from '../../../core/data/salas-service';
import { PeliculasService } from '../../../core/data/peliculas-service';
import type { Funcion } from '../../../core/models/funcion';
import type { Sala } from '../../../core/models/sala';
import type { PeliculaConCatalogo } from '../../../core/models/pelicula';
import { SelectorFecha } from '../../../shared/ui/selector-fecha/selector-fecha';

export interface FuncionFila {
  id: string;
  peliculaTitulo: string;
  salaNombre: string;
  comienzaEn: string;
  terminaEn: string;
  formatoCodigo: string;
  versionIdiomaNombre: string;
  estado: string;
}

@Component({
  selector: 'nc-funciones',
  standalone: true,
  imports: [CommonModule, RouterLink, SelectorFecha],
  templateUrl: './funciones.html',
  styleUrl: './funciones.css',
})
export class Funciones implements OnInit {
  private programacionService = inject(ProgramacionService);
  private salasService = inject(SalasService);
  private peliculasService = inject(PeliculasService);

  fechaSeleccionada = signal<string>(this.obtenerHoyIso());
  funciones = signal<FuncionFila[]>([]);
  cargando = signal<boolean>(true);
  error = signal<string>('');

  private salasMap = new Map<string, Sala>();
  private peliculasMap = new Map<string, PeliculaConCatalogo>();
  private formatosMap = new Map<number, string>();
  private idiomasMap = new Map<number, string>();

  async ngOnInit(): Promise<void> {
    try {
      const [salas, pelis, fmts, idms] = await Promise.all([
        this.salasService.listar(),
        this.peliculasService.listar(),
        this.programacionService.obtenerFormatos(),
        this.programacionService.obtenerVersionesIdioma(),
      ]);

      salas.forEach((s) => this.salasMap.set(s.id, s));
      pelis.forEach((p) => this.peliculasMap.set(p.id, p));
      fmts.forEach((f) => this.formatosMap.set(f.id, f.codigo));
      idms.forEach((i) => this.idiomasMap.set(i.id, i.nombre));

      await this.cargarFunciones(this.fechaSeleccionada());
    } catch (e: any) {
      this.error.set(e?.message || 'Error al cargar datos');
      this.cargando.set(false);
    }
  }

  async onFechaElegida(fecha: Date): Promise<void> {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    this.fechaSeleccionada.set(iso);
    await this.cargarFunciones(iso);
  }

  async cargarFunciones(fechaStr: string): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const datos = await this.programacionService.consultarFuncionesDelDia(fechaStr);
      const mapeadas: FuncionFila[] = datos.map((f: Funcion) => ({
        id: f.id,
        peliculaTitulo: this.peliculasMap.get(f.pelicula_id)?.titulo || 'Película',
        salaNombre: this.salasMap.get(f.sala_id)?.nombre || 'Sala',
        comienzaEn: f.comienza_en,
        terminaEn: f.termina_en,
        formatoCodigo: this.formatosMap.get(f.formato_id) || '2D',
        versionIdiomaNombre: this.idiomasMap.get(f.version_idioma_id) || 'Castellano',
        estado: f.estado,
      }));

      // Ordenadas cronológicamente
      mapeadas.sort(
        (a, b) => new Date(a.comienzaEn).getTime() - new Date(b.comienzaEn).getTime()
      );
      this.funciones.set(mapeadas);
    } catch (e: any) {
      this.error.set(e?.message || 'Error al consultar las funciones del día');
    } finally {
      this.cargando.set(false);
    }
  }

  private obtenerHoyIso(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
