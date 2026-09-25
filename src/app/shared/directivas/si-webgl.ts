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
  let bandera = false;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      bandera = probarContextoWebgl();
    } catch {
      bandera = false;
    }
  }

  return bandera;
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
    } else {
      const sino = this.appSiWebglSino();

      if (sino !== null && sino !== undefined) {
        this.contenedor.createEmbeddedView(sino);
      }
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function probarContextoWebgl(): boolean {
  let bandera = false;

  if (window.WebGLRenderingContext !== undefined && window.WebGLRenderingContext !== null) {
    const canvas = document.createElement('canvas');
    const contextoWebgl2 = canvas.getContext('webgl2');

    if (contextoWebgl2 !== null) {
      bandera = true;
    } else {
      const contextoWebgl = canvas.getContext('webgl');

      if (contextoWebgl !== null) {
        bandera = true;
      } else {
        // experimental-webgl no está en los tipos de getContext, por eso el cast.
        const lienzo = canvas as unknown as { getContext(id: string): unknown };
        const contextoExperimental = lienzo.getContext('experimental-webgl');

        if (contextoExperimental !== null && contextoExperimental !== undefined) {
          bandera = true;
        }
      }
    }
  }

  return bandera;
}
