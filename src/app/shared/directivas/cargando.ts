import {
  Component,
  Directive,
  inject,
  input,
  OnChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

export type EstadoConsulta<T> =
  { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'datos'; datos: T[] };

@Component({
  selector: 'nc-carga-consulta',
  templateUrl: './carga-consulta.html',
})
class CargaConsulta {}

@Directive({ selector: '[appCargando]' })
export class Cargando<T> implements OnChanges {
  readonly appCargando = input.required<EstadoConsulta<T>>();
  readonly appCargandoVacio = input.required<TemplateRef<unknown>>();
  readonly appCargandoError = input.required<TemplateRef<{ $implicit: string }>>();
  private readonly template = inject<TemplateRef<{ $implicit: T[] }>>(TemplateRef);
  private readonly contenedor = inject(ViewContainerRef);

  ngOnChanges(): void {
    this.contenedor.clear();
    const estado = this.appCargando();
    if (estado.tipo === 'cargando') this.contenedor.createComponent(CargaConsulta);
    else if (estado.tipo === 'error')
      this.contenedor.createEmbeddedView(this.appCargandoError(), { $implicit: estado.mensaje });
    else if (!estado.datos.length) this.contenedor.createEmbeddedView(this.appCargandoVacio());
    else this.contenedor.createEmbeddedView(this.template, { $implicit: estado.datos });
  }
}
