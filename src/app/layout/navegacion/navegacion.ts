import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { SiRol } from '../../shared/directivas/si-rol';

interface Enlace {
  ruta: string;
  texto: string;
}

@Component({
  selector: 'nc-navegacion',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, SiRol],
  templateUrl: './navegacion.html',
  styleUrl: './navegacion.css',
})
export class Navegacion {
  protected readonly auth = inject(AuthService);

  // Secciones que ve cualquier visitante.
  protected readonly publicos: Enlace[] = [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/cartelera', texto: 'Cartelera' },
    { ruta: '/proximamente', texto: 'Próximamente' },
    { ruta: '/candy', texto: 'Candy' },
  ];

  // Secciones del personal, cada grupo detrás de *appSiRol.
  protected readonly boleteria: Enlace = { ruta: '/boleteria', texto: 'Boletería' };
  protected readonly panel: Enlace = { ruta: '/admin', texto: 'Panel' };
}
