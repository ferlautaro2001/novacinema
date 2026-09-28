import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Menu } from '../../candy/menu/menu';

// "Sumá algo del Candy" dentro de la compra de entradas (AC-08.05.01): el mismo
// menú, pero "Tu pedido" vuelve al resumen de esta compra, donde el pedido se
// suma al total y se paga con las entradas.
@Component({
  selector: 'nc-sumar-candy',
  imports: [Menu],
  templateUrl: './sumar-candy.html',
  styleUrl: './sumar-candy.css',
})
export class SumarCandy {
  private route = inject(ActivatedRoute);

  funcionId = this.route.snapshot.paramMap.get('funcionId');
}
