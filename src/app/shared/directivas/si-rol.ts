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
    const permitidos = this.appSiRol();

    let tieneRol = false;

    if (actual !== null && actual !== undefined && actual !== '') {
      if (permitidos.includes(actual)) {
        tieneRol = true;
      }
    }

    if (tieneRol) {
      this.contenedor.createEmbeddedView(this.template);
    } else {
      const sino = this.appSiRolSino();

      if (sino !== null && sino !== undefined) {
        this.contenedor.createEmbeddedView(sino);
      }
    }
  }
}
