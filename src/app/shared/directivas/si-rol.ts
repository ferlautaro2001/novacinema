import { Directive, inject, input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';

// Uso: <ng-container *appSiRol="['administrador']; actual: rol(); sino: tplCliente">
// El rol actual lo recibo como input y no de un servicio para enterarme en ngOnChanges
// cuando cambia la sesión (además, shared no puede depender de core).
@Directive({ selector: '[appSiRol]' })
export class SiRol implements OnChanges {
  appSiRol = input.required<string[]>();
  appSiRolActual = input<string | null | undefined>(null);
  appSiRolSino = input<TemplateRef<unknown> | null>(null);

  private template = inject(TemplateRef);
  private contenedor = inject(ViewContainerRef);

  ngOnChanges(): void {
    // Limpio antes de crear: si no, cada cambio sumaría otra copia.
    this.contenedor.clear();

    const actual = this.appSiRolActual();
    if (actual && this.appSiRol().includes(actual)) {
      this.contenedor.createEmbeddedView(this.template);
      return;
    }

    const sino = this.appSiRolSino();
    if (sino) this.contenedor.createEmbeddedView(sino);
  }
}
