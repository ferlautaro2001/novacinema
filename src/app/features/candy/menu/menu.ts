import { Component, inject, OnInit, signal } from '@angular/core';
import { CandyService } from '../../../core/data/candy-service';
import type { CategoriaDelMenu } from '../../../core/models/candy';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { ProductoCard } from '../producto-card/producto-card';

// El menú del Candy (US-08.03): los productos disponibles agrupados por
// categoría, en el orden de la carta (AC-08.03.01). Lo puede ver cualquiera;
// pedir llega con US-08.04.
@Component({
  selector: 'nc-menu',
  imports: [Cargando, ProductoCard],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit {
  private candy = inject(CandyService);

  estado = signal<EstadoConsulta<CategoriaDelMenu>>({ tipo: 'cargando' });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });

    try {
      const categorias = await this.candy.listarMenu();

      this.estado.set({ tipo: 'datos', datos: categorias });
    } catch {
      this.estado.set({ tipo: 'error', mensaje: 'No se pudo cargar el menú. Probá de nuevo.' });
    }
  }

  // Los atajos son botones y no enlaces "#…": con <base href="/"> un enlace así
  // llevaría al inicio. El foco va al título para que el lector de pantalla
  // también salte.
  irA(categoria: CategoriaDelMenu): void {
    const id = this.ancla(categoria);
    const seccion = document.getElementById(id);
    const titulo = document.getElementById(`${id}-titulo`);

    if (seccion !== null) {
      seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (titulo !== null) {
      titulo.focus({ preventScroll: true });
    }
  }

  // El id de la sección para los atajos de arriba ("candy-pochoclos").
  ancla(categoria: CategoriaDelMenu): string {
    const minusculas = categoria.nombre.toLowerCase();
    const sinAcentos = minusculas.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const id = `candy-${sinAcentos}`;

    return id;
  }

  // "3 productos" o "1 producto".
  cantidad(categoria: CategoriaDelMenu): string {
    const total = categoria.productos.length;

    let texto = `${total} productos`;

    if (total === 1) {
      texto = '1 producto';
    }

    return texto;
  }
}
