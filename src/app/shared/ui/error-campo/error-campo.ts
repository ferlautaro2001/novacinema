import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

// Un mensaje por error: se muestra solo si el control tiene ese error. Cuándo
// mostrarlos (después de que el usuario pasó por el campo) lo decide nc-campo-texto,
// que es el que los proyecta.
@Component({
  selector: 'nc-error-campo',
  templateUrl: './error-campo.html',
  styleUrl: './error-campo.css',
})
export class ErrorCampo implements OnInit, OnDestroy {
  readonly control = input.required<AbstractControl>();
  readonly error = input.required<string>();

  protected readonly visible = signal(false);
  private suscripcion?: Subscription;

  ngOnInit(): void {
    this.actualizar();
    this.suscripcion = this.control().events.subscribe(() => this.actualizar());
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  private actualizar(): void {
    this.visible.set(this.control().hasError(this.error()));
  }
}
