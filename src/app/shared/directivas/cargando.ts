import { Directive, inject, input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { CargaConsulta } from '../ui/carga-consulta/carga-consulta';

export type EstadoConsulta<T> =
  { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'datos'; datos: T[] };

// Muestra una de cuatro cosas según el estado: carga, error, lista vacía o los datos.
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
      // Si no me pasan un template de carga, uso el mensaje por defecto.
      const carga = this.appCargandoCarga();

      if (carga !== undefined) {
        this.contenedor.createEmbeddedView(carga);
      } else {
        this.contenedor.createComponent(CargaConsulta);
      }
    } else if (estado.tipo === 'error') {
      const templateError = this.appCargandoError();
      const contextoError = { $implicit: estado.mensaje };
      this.contenedor.createEmbeddedView(templateError, contextoError);
    } else if (estado.datos.length === 0) {
      const templateVacio = this.appCargandoVacio();
      this.contenedor.createEmbeddedView(templateVacio);
    } else {
      const contextoDatos = { $implicit: estado.datos };
      this.contenedor.createEmbeddedView(this.template, contextoDatos);
    }
  }
}
