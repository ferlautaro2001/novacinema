import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

// Un mensaje por error: se ve solo si el control tiene ese error. Cuándo mostrarlos
// lo decide el campo que lo proyecta (nc-campo-texto o nc-campo-fecha).
@Component({
  selector: 'nc-error-campo',
  templateUrl: './error-campo.html',
  styleUrl: './error-campo.css',
})
export class ErrorCampo implements OnInit, OnDestroy {
  control = input.required<AbstractControl>();
  error = input.required<string>();

  // Como es OnPush, escucho los eventos del control y guardo el resultado en un signal.
  visible = signal(false);
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
    const tieneError = control.hasError(this.error());

    this.visible.set(tieneError);
  }
}
