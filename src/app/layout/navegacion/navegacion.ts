import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Enlace {
  ruta: string;
  texto: string;
}

@Component({
  selector: 'nc-navegacion',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './navegacion.html',
  styleUrl: './navegacion.css',
})
export class Navegacion {
  // Secciones que ve cualquier visitante. Los grupos del cliente, el empleado y el
  // administrador se suman en US-02.05, cada uno detrás de *appSiRol.
  protected readonly publicos: Enlace[] = [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/cartelera', texto: 'Cartelera' },
    { ruta: '/proximamente', texto: 'Próximamente' },
    { ruta: '/candy', texto: 'Candy' },
  ];
}
