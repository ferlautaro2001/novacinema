import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth-service';

// Por ahora muestra quién está logueado; el perfil completo (datos, edición,
// puntos y crédito) llega con US-11.01.
@Component({
  selector: 'nc-perfil',
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  auth = inject(AuthService);
}
