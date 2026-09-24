import { Directive, input } from '@angular/core';
import type { TipoButaca } from '../ui/mapa-butacas/distribucion';

// Directiva de atributo que aplica clases de estilo al elemento según el tipo de butaca (AC-04.02.03).
// Puede recibir 'comun', 'vip' o 'accesible' (o alias de seatmap 'std', 'wc').
@Directive({
  selector: '[appTipoButaca]',
  host: {
    '[class.t-comun]': 'esComun()',
    '[class.t-std]': 'esComun()',
    '[class.t-vip]': 'esVip()',
    '[class.t-accesible]': 'esAccesible()',
    '[class.t-wc]': 'esAccesible()',
    '[attr.data-tipo]': 'tipoNormalizado()',
  },
})
export class TipoButacaDirective {
  appTipoButaca = input<TipoButaca | 'std' | 'wc'>('comun');

  tipoNormalizado(): TipoButaca {
    const val = this.appTipoButaca();
    if (val === 'wc' || val === 'accesible') return 'accesible';
    if (val === 'vip') return 'vip';
    return 'comun';
  }

  esComun(): boolean {
    return this.tipoNormalizado() === 'comun';
  }

  esVip(): boolean {
    return this.tipoNormalizado() === 'vip';
  }

  esAccesible(): boolean {
    return this.tipoNormalizado() === 'accesible';
  }
}
