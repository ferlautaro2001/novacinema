import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appFocoInicial]' })
export class FocoInicial {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    afterNextRender(() => this.elemento.nativeElement.focus());
  }
}
