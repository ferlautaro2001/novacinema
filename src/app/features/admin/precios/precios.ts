import { Component } from '@angular/core';
import { FormularioConCambios } from '../../../core/guards/cambios-pendientes-guard';

@Component({
  selector: 'nc-precios',
  templateUrl: './precios.html',
  styleUrl: './precios.css',
})
export class Precios implements FormularioConCambios {
  noGuardado(): boolean {
    return false;
  }
}
