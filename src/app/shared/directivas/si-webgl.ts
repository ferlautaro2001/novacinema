import {
  Directive,
  inject,
  input,
  OnChanges,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

export function soportaWebgl(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        (canvas.getContext as (id: string) => unknown)('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// Directiva estructural que valida la disponibilidad de WebGL en el navegador (AC-04.02.04).
// Si hay soporte de WebGL, renderiza la vista 3D o el botón 3D activo.
// Si no hay soporte, renderiza la plantilla alternativa `sino:`.
//
// Uso:
//   <button *appSiWebgl="; sino: tplSinWebgl" ...>Vista 3D</button>
//   <ng-template #tplSinWebgl>
//     <button disabled title="3D no disponible en este navegador">3D no disponible en este navegador</button>
//   </ng-template>
@Directive({ selector: '[appSiWebgl]' })
export class SiWebgl implements OnInit, OnChanges {
  appSiWebgl = input<boolean | string | null | undefined>(undefined);
  appSiWebglSino = input<TemplateRef<unknown> | null>(null);

  private template = inject(TemplateRef);
  private contenedor = inject(ViewContainerRef);

  ngOnInit(): void {
    this.actualizar();
  }

  ngOnChanges(): void {
    this.actualizar();
  }

  private actualizar(): void {
    this.contenedor.clear();
    const val = this.appSiWebgl();
    const soportado =
      typeof val === 'boolean'
        ? val
        : soportaWebgl();

    if (soportado) {
      this.contenedor.createEmbeddedView(this.template);
    } else {
      const sino = this.appSiWebglSino();
      if (sino) {
        this.contenedor.createEmbeddedView(sino);
      }
    }
  }
}
