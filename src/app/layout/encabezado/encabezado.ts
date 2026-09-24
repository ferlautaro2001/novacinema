import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navegacion } from '../navegacion/navegacion';

@Component({
  selector: 'nc-encabezado',
  imports: [RouterLink, Navegacion],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css',
})
export class Encabezado {}
