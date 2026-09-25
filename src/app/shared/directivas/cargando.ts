import {
  Directive,
  inject,
  input,
  OnChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { CargaConsulta } from '../ui/carga-consulta/carga-consulta';

export type EstadoConsulta<T> =
  { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'datos'; datos: T[] };

@Directive({ selector: '[appCargando]' })
export class Cargando<T> implements OnChanges {
  appCargando = input.required<EstadoConsulta<T>>();
  appCargandoVacio = input.required<TemplateRef<unknown>>();
  appCargandoError = input.required<TemplateRef<{ $implicit: string }>>();
  appCargandoCarga = input<TemplateRef<unknown>>();

  private template = inject<TemplateRef<{ $implicit: T[] }>>(TemplateRef);
  private contenedor = inject(ViewContainerRef);

  ngOnChanges(): void {
    this.contenedor.clear();
    const estado = this.appCargando();
    if (estado.tipo === 'cargando') {
      const cargaTpl = this.appCargandoCarga();
      if (cargaTpl) {
        this.contenedor.createEmbeddedView(cargaTpl);
      } else {
        this.contenedor.createComponent(CargaConsulta);
      }
    } else if (estado.tipo === 'error') {
      this.contenedor.createEmbeddedView(this.appCargandoError(), { $implicit: estado.mensaje });
    } else if (estado.datos.length === 0) {
      this.contenedor.createEmbeddedView(this.appCargandoVacio());
    } else {
      this.contenedor.createEmbeddedView(this.template, { $implicit: estado.datos });
    }
  }
}
