import { Component, inject } from '@angular/core';
import { TelonServicio } from './telon-servicio';

// El telón de apertura. Dos cortinas rojas cerradas, unas luces desde abajo y la
// claqueta en medio. Al tocarla, las cortinas se.corren y se entra al sitio.
//
// Solo se muestra una vez por sesión: si el visitante recarga no vuelve a verla,
// así no lo atrapa a nadie mientras trabaja. El estado está en TelonServicio.
@Component({
  selector: 'nc-telon',
  templateUrl: './telon.html',
  styleUrl: './telon.css',
})
export class Telon {
  private estado = inject(TelonServicio);

  visible = this.estado.visible;
  abriendo = this.estado.abriendo;

  abrir(): void {
    this.estado.abrir();
  }
}
