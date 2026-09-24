import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export type TipoCampo = 'text' | 'email' | 'password' | 'number' | 'tel';

// Campo de formulario con su etiqueta y el lugar para los mensajes de error, que
// llegan proyectados (<nc-error-campo>). Los errores se muestran recién cuando el
// usuario pasó por el campo, así el formulario no arranca lleno de rojo.
@Component({
  selector: 'nc-campo-texto',
  imports: [ReactiveFormsModule],
  // El id es para el <input>: si también quedara en <nc-campo-texto> habría dos
  // elementos con el mismo id y la etiqueta podría apuntar al equivocado.
  host: { '[attr.id]': 'null' },
  templateUrl: './campo-texto.html',
  styleUrl: './campo-texto.css',
})
export class CampoTexto implements OnInit, OnDestroy {
  readonly id = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly tipo = input<TipoCampo>('text');
  readonly control = input.required<FormControl>();

  protected readonly mostrarErrores = signal(false);

  // Los componentes son OnPush por defecto: si el template leyera control.touched
  // directamente no se enteraría de los cambios. Escucho los eventos del control y
  // guardo el resultado en un Signal.
  private suscripcion?: Subscription;

  ngOnInit(): void {
    this.actualizar();
    this.suscripcion = this.control().events.subscribe(() => this.actualizar());
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  private actualizar(): void {
    const control = this.control();
    this.mostrarErrores.set(control.touched && control.invalid);
  }
}
