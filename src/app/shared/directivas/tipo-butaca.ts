import { computed, Directive, input } from '@angular/core';
import type { TipoButaca } from '../../core/reglas/butacas';

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

  tipoNormalizado = computed<TipoButaca>(() => {
    const val = this.appTipoButaca();
    if (val === 'wc' || val === 'accesible') return 'accesible';
    if (val === 'vip') return 'vip';
    return 'comun';
  });

  esComun = computed(() => this.tipoNormalizado() === 'comun');
  esVip = computed(() => this.tipoNormalizado() === 'vip');
  esAccesible = computed(() => this.tipoNormalizado() === 'accesible');
}
