import { Directive, input } from '@angular/core';
import type { TipoButaca } from '../ui/mapa-butacas/distribucion';

// Pone la clase según el tipo de butaca. También acepta 'std' y 'wc', los nombres
// que usaba seatmap.html, por eso cada tipo tiene dos clases.
@Directive({
  selector: '[appTipoButaca]',
  host: {
    '[class.t-comun]': 'esComun()',
    '[class.t-std]': 'esComun()',
    '[class.t-vip]': 'esVip()',
    '[class.t-accesible]': 'esAccesible()',
    '[class.t-wc]': 'esAccesible()',
    '[attr.data-tipo]': 'tipo()',
  },
})
export class TipoButacaDirective {
  appTipoButaca = input<TipoButaca | 'std' | 'wc'>('comun');

  tipo(): TipoButaca {
    const valor = this.appTipoButaca();
    if (valor === 'wc' || valor === 'accesible') return 'accesible';
    if (valor === 'vip') return 'vip';
    return 'comun';
  }

  esComun(): boolean {
    return this.tipo() === 'comun';
  }

  esVip(): boolean {
    return this.tipo() === 'vip';
  }

  esAccesible(): boolean {
    return this.tipo() === 'accesible';
  }
}
