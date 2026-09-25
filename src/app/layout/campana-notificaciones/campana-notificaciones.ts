import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificacionesService } from '../../core/data/notificaciones-service';

// Muestra los avisos de apertura de venta (US-06.08). Llegan por Realtime o al ingresar.
@Component({
  selector: 'nc-campana-notificaciones',
  imports: [RouterLink],
  templateUrl: './campana-notificaciones.html',
  styleUrl: './campana-notificaciones.css',
})
export class CampanaNotificaciones {
  notificaciones = inject(NotificacionesService);

  descartar(id: string): void {
    this.notificaciones.descartar(id);
  }
}
