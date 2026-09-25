import { Component } from '@angular/core';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';

@Component({
  selector: 'nc-preventa',
  templateUrl: './preventa.html',
  styleUrl: './preventa.css',
})
export class Preventa implements FormularioConCambios {
  noGuardado(): boolean {
    return false;
  }
}
