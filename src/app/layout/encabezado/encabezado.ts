import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { Navegacion } from '../navegacion/navegacion';

@Component({
  selector: 'nc-encabezado',
  imports: [RouterLink, Navegacion],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css',
})
export class Encabezado {
  protected readonly auth = inject(AuthService);
}
