import { Component, computed, inject, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { StorageService } from '../../../core/data/storage-service';
import type { ProductoConPrecio } from '../../../core/models/candy';

// La card de un producto del Candy (US-08.03): imagen, nombre, descripción y
// precio. Lo que se puede hacer con el producto (sumarlo al pedido en US-08.04)
// entra por el slot [acciones], así la misma card sirve para mirar y para pedir.
@Component({
  selector: 'nc-producto-card',
  imports: [CurrencyPipe],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  private storage = inject(StorageService);

  producto = input.required<ProductoConPrecio>();

  imagen = computed(() => {
    const url = this.storage.urlPublica(this.producto().imagenPath);

    return url;
  });
}
