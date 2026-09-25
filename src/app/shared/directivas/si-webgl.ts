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
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    if (!window.WebGLRenderingContext) return false;
    const canvas = document.createElement('canvas');
    if (canvas.getContext('webgl2') || canvas.getContext('webgl')) return true;
    // experimental-webgl no está en los tipos de getContext, por eso el cast.
    return !!(canvas.getContext as (id: string) => unknown)('experimental-webgl');
  } catch {
    return false;
  }
}

// Uso: <button *appSiWebgl="; sino: tplSinWebgl">Vista 3D</button>
// Si recibe un boolean lo uso tal cual; si no, pruebo el navegador.
@Directive({ selector: '[appSiWebgl]' })
export class SiWebgl implements OnInit, OnChanges {
  appSiWebgl = input<boolean | string | null | undefined>(undefined);
  appSiWebglSino = input<TemplateRef<unknown> | null>(null);

  private template = inject(TemplateRef);
  private contenedor = inject(ViewContainerRef);

  // También en ngOnInit porque si no se enlaza ningún input, ngOnChanges no corre.
  ngOnInit(): void {
    this.actualizar();
  }

  ngOnChanges(): void {
    this.actualizar();
  }

  private actualizar(): void {
    this.contenedor.clear();

    const valor = this.appSiWebgl();
    let soportado: boolean;
    if (typeof valor === 'boolean') {
      soportado = valor;
    } else {
      soportado = soportaWebgl();
    }

    if (soportado) {
      this.contenedor.createEmbeddedView(this.template);
      return;
    }

    const sino = this.appSiWebglSino();
    if (sino) this.contenedor.createEmbeddedView(sino);
  }
}
