import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth-service';
import { Encabezado } from './layout/encabezado/encabezado';
import { PantallaCarga } from './layout/pantalla-carga/pantalla-carga';
import { Pie } from './layout/pie/pie';

@Component({
  imports: [RouterOutlet, Encabezado, PantallaCarga, Pie],
  selector: 'nc-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
}
