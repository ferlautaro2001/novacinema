import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DetallePelicula } from '../detalle-pelicula/detalle-pelicula';

// Pantalla del enlace directo cartelera/:id: abre el modal de detalle (US-06.06).
@Component({
  selector: 'nc-detalle',
  imports: [DetallePelicula],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class Detalle implements OnInit, OnDestroy {
  protected peliculaId = signal('');

  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private suscripcion: Subscription | null = null;

  ngOnInit(): void {
    this.suscripcion = this.ruta.paramMap.subscribe((parametros) =>
      this.leerParametros(parametros),
    );
  }

  ngOnDestroy(): void {
    if (this.suscripcion !== null) {
      this.suscripcion.unsubscribe();
    }
  }

  protected cerrar(): void {
    this.router.navigate(['/cartelera']);
  }

  private leerParametros(parametros: ParamMap): void {
    let id = '';
    const valor = parametros.get('id');

    if (valor !== null) {
      id = valor;
    }

    this.peliculaId.set(id);
  }
}
