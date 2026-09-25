import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export type TipoCampo = 'text' | 'email' | 'password' | 'number' | 'tel';

// Los errores llegan proyectados (<nc-error-campo>) y los muestro recién cuando el
// usuario pasó por el campo, así el formulario no arranca lleno de rojo.
@Component({
  selector: 'nc-campo-texto',
  imports: [ReactiveFormsModule],
  // El id es para el <input>: si quedara también en el host habría dos elementos con
  // el mismo id y la etiqueta podría apuntar al equivocado.
  host: { '[attr.id]': 'null' },
  templateUrl: './campo-texto.html',
  styleUrl: './campo-texto.css',
})
export class CampoTexto implements OnInit, OnDestroy {
  id = input.required<string>();
  etiqueta = input.required<string>();
  tipo = input<TipoCampo>('text');
  control = input.required<FormControl>();
  // Valor de autocomplete del navegador: 'email', 'new-password', 'given-name'...
  autocompletar = input('off');

  mostrarErrores = signal(false);

  // El componente es OnPush: si el template leyera control.touched no se enteraría
  // de los cambios, así que escucho los eventos del control y lo guardo en un signal.
  private suscripcion?: Subscription;

  ngOnInit(): void {
    this.actualizar();
    this.suscripcion = this.control().events.subscribe(() => this.actualizar());
  }

  ngOnDestroy(): void {
    if (this.suscripcion !== undefined) {
      this.suscripcion.unsubscribe();
    }
  }

  private actualizar(): void {
    const control = this.control();

    let hayQueMostrar = false;

    if (control.touched && control.invalid) {
      hayQueMostrar = true;
    }

    this.mostrarErrores.set(hayQueMostrar);
  }
}
