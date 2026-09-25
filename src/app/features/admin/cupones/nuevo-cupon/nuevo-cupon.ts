import { Component } from '@angular/core';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';

@Component({
  selector: 'nc-nuevo-cupon',
  templateUrl: './nuevo-cupon.html',
  styleUrl: './nuevo-cupon.css',
})
export class NuevoCupon implements FormularioConCambios {
  noGuardado(): boolean {
    return false;
  }
}
