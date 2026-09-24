import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Encabezado } from './layout/encabezado/encabezado';
import { Pie } from './layout/pie/pie';

@Component({
  imports: [RouterOutlet, Encabezado, Pie],
  selector: 'nc-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
