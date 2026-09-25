import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth-service';

// Por ahora solo muestra quién está logueado.
@Component({
  selector: 'nc-perfil',
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  auth = inject(AuthService);
}
