import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CandyService } from '../../../core/data/candy-service';
import type { CategoriaDelMenu, ProductoConPrecio } from '../../../core/models/candy';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { Cantidad } from '../cantidad/cantidad';
import { MAXIMO_POR_PRODUCTO, PedidoEstado } from '../pedido-estado';
import { ProductoCard } from '../producto-card/producto-card';
import { ResumenPedido } from '../resumen-pedido/resumen-pedido';

// El menú del Candy (US-08.03): los productos disponibles agrupados por
// categoría, en el orden de la carta (AC-08.03.01). Lo puede ver cualquiera.
//
// Desde acá se arma el pedido (US-08.04): cada card suma o resta, y "Tu pedido"
// muestra subtotales y total. Vincularlo a una compra llega con US-08.05.
@Component({
  selector: 'nc-menu',
  imports: [Cargando, Cantidad, ProductoCard, ResumenPedido],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit, OnDestroy {
  private candy = inject(CandyService);
  pedido = inject(PedidoEstado);

  estado = signal<EstadoConsulta<CategoriaDelMenu>>({ tipo: 'cargando' });
  aviso = signal('');

  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorAviso);
  }

  sumar(producto: ProductoConPrecio): void {
    const sumado = this.pedido.sumar(producto);

    if (sumado === false) {
      this.avisarMaximo();
    }
  }

  // "Máximo 10 unidades por producto" (AC-08.04.01). Se va solo a los pocos
  // segundos.
  avisarMaximo(): void {
    this.aviso.set(`Máximo ${MAXIMO_POR_PRODUCTO} unidades por producto`);
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(''), 3500);
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
