import { Component, input } from '@angular/core';

@Component({
  selector: 'nc-carga-consulta',
  imports: [],
  templateUrl: './carga-consulta.html',
  styleUrl: './carga-consulta.css',
})
export class CargaConsulta {
  mensaje = input('Cargando películas…');
}
