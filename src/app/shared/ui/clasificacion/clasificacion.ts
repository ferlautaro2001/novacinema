import { Component, input } from '@angular/core';
import { Clasificacion as Codigo, EDADES_MINIMAS } from '../../../core/models/pelicula';

@Component({
  selector: 'nc-clasificacion',
  template: `<span
    class="distintivo caption"
    [class.atp]="codigo() === 'ATP'"
    [class.mayores]="codigo() === '+18'"
    [class.intermedia]="codigo() === '+13' || codigo() === '+16'"
    [attr.title]="'Edad mínima: ' + edades[codigo()] + ' años'"
    >{{ codigo() }}</span
  >`,
  styles: `
    .distintivo {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border-200);
      border-radius: var(--radius-pill);
      color: var(--ink-100);
    }
    .atp {
      background: var(--success-tint);
      border-color: var(--success);
    }
    .intermedia {
      background: var(--warning-tint);
      border-color: var(--warning);
    }
    .mayores {
      background: var(--danger-tint);
      border-color: var(--danger);
    }
  `,
})
export class Clasificacion {
  readonly codigo = input.required<Codigo>();
  protected readonly edades = EDADES_MINIMAS;
}
