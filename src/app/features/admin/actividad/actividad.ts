import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActividadService } from '../../../core/data/actividad-service';
import type { GrupoActividad, RegistroActividad } from '../../../core/models/actividad';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { TablaDatos } from '../../../shared/ui/tabla-datos/tabla-datos';

// El registro de actividad (US-12.06). Solo lectura: el log lo escribe la base con
// triggers y la RLS deja leerlo únicamente al administrador, así que acá no hay
// ninguna acción que pueda alterarlo.
@Component({
  selector: 'nc-actividad',
  imports: [DatePipe, Cargando, TablaDatos],
  templateUrl: './actividad.html',
  styleUrl: './actividad.css',
})
export class Actividad implements OnInit {
  private servicio = inject(ActividadService);

  estado = signal<EstadoConsulta<RegistroActividad>>({ tipo: 'cargando' });
  grupo = signal<GrupoActividad | 'todos'>('todos');

  // Los tres filtros de AC-12.06.02, más 'todos' y 'otros'.
  grupos: { clave: GrupoActividad | 'todos'; texto: string }[] = [
    { clave: 'todos', texto: 'Todos' },
    { clave: 'funciones', texto: 'Funciones' },
    { clave: 'precios', texto: 'Precios' },
    { clave: 'validaciones', texto: 'Validaciones' },
    { clave: 'otros', texto: 'Otros' },
  ];

  // Un color por grupo, tomado de los badges del design system.
  variantes: Record<GrupoActividad, string> = {
    funciones: 'nc-badge--brand',
    precios: 'nc-badge--gold',
    validaciones: 'nc-badge--info',
    otros: 'nc-badge--neutral',
  };

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });

    try {
      const registros = await this.servicio.findAll(this.grupo());

      this.estado.set({ tipo: 'datos', datos: registros });
    } catch {
      this.estado.set({
        tipo: 'error',
        mensaje: 'No se pudo cargar el registro de actividad. Probá de nuevo.',
      });
    }
  }

  elegirGrupo(clave: GrupoActividad | 'todos'): void {
    if (this.grupo() !== clave) {
      this.grupo.set(clave);
      this.cargar();
    }
  }

  // El color del badge viene del grupo, pero nunca lo dice solo: al lado está
  // escrito qué pasó, que es lo que lee la regla de estados del design system.
  varianteDe(registro: RegistroActividad): string {
    const clases = 'nc-badge ' + this.variantes[registro.grupo];

    return clases;
  }
}
