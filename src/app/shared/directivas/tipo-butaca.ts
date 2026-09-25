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

    let bandera: TipoButaca = 'comun';

    if (valor === 'wc' || valor === 'accesible') {
      bandera = 'accesible';
    } else if (valor === 'vip') {
      bandera = 'vip';
    }

    return bandera;
  }

  esComun(): boolean {
    const bandera = this.esTipo('comun');

    return bandera;
  }

  esVip(): boolean {
    const bandera = this.esTipo('vip');

    return bandera;
  }

  esAccesible(): boolean {
    const bandera = this.esTipo('accesible');

    return bandera;
  }

  private esTipo(buscado: TipoButaca): boolean {
    let bandera = false;

    if (this.tipo() === buscado) {
      bandera = true;
    }

    return bandera;
  }
}
