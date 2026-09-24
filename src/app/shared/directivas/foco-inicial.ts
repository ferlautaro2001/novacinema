import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appFocoInicial]' })
export class FocoInicial implements AfterViewInit {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    this.elemento.nativeElement.focus();
  }
}
