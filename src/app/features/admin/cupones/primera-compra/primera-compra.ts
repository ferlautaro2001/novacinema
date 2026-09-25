import { Component } from '@angular/core';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';

@Component({
  selector: 'nc-primera-compra',
  templateUrl: './primera-compra.html',
  styleUrl: './primera-compra.css',
})
export class PrimeraCompra implements FormularioConCambios {
  noGuardado(): boolean {
    return false;
  }
}
