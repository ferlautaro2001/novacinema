import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FuncionesService } from '../../../core/data/funciones-service';
import type { FuncionParaComprar } from '../../../core/models/funcion';
import { CargaConsulta } from '../../../shared/ui/carga-consulta/carga-consulta';

// La pantalla a la que lleva elegir el horario (US-07.01). Muestra el resumen de
// la función elegida; el mapa para elegir butacas es US-07.04.
//
// Acá no se usa EstadoConsulta como en el resto de las pantallas porque ese
// estado es para listas y esto es una sola función. Los tres estados se ven
// explícitos en el template.
type EstadoResumen = 'cargando' | 'listo' | 'error';

@Component({
  selector: 'nc-elegir-butacas',
  imports: [DatePipe, RouterLink, CargaConsulta],
  templateUrl: './elegir-butacas.html',
  styleUrl: './elegir-butacas.css',
})
export class ElegirButacas implements OnInit {
  private route = inject(ActivatedRoute);
  private funcionesService = inject(FuncionesService);

  estado = signal<EstadoResumen>('cargando');
  funcion = signal<FuncionParaComprar | null>(null);
  mensaje = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('funcionId');

    if (id === null || id === '') {
      this.funcion.set(null);
      this.estado.set('listo');

      return;
    }

    this.estado.set('cargando');

    try {
      const funcion = await this.funcionesService.buscarParaComprar(id);

      this.funcion.set(funcion);
      this.estado.set('listo');
    } catch {
      this.estado.set('error');
      this.mensaje.set('No se pudo cargar la función elegida. Probá de nuevo.');
    }
  }
}
