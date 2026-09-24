import { Directive, inject, input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';

// Directiva estructural: muestra su template solo si el rol actual está entre los
// permitidos y, si no, el template alternativo (`sino:`), si hay uno.
//
//   <ng-container *appSiRol="['administrador']; actual: rol(); sino: tplCliente">…
//
// El rol actual entra como input (en lugar de leerlo de un servicio) para que la
// directiva se entere en ngOnChanges cuando cambia la sesión. Solo decide qué se
// muestra: quién puede entrar lo resuelven los guards, y qué datos ve, RLS.
@Directive({ selector: '[appSiRol]' })
export class SiRol implements OnChanges {
  appSiRol = input.required<string[]>();
  appSiRolActual = input<string | null | undefined>(null);
  appSiRolSino = input<TemplateRef<unknown> | null>(null);

  private template = inject(TemplateRef);
  private contenedor = inject(ViewContainerRef);

  ngOnChanges(): void {
    // Siempre se limpia antes de crear: si no, cada cambio sumaría otra copia.
    this.contenedor.clear();
    const actual = this.appSiRolActual();
    if (actual && this.appSiRol().includes(actual)) {
      this.contenedor.createEmbeddedView(this.template);
    } else {
      const sino = this.appSiRolSino();
      if (sino) this.contenedor.createEmbeddedView(sino);
    }
  }
}
