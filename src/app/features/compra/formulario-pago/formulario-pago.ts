import { Component, computed, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PATRON_VENCIMIENTO, tarjetaNoVencida } from '../../../shared/validadores/tarjeta';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';

// El pago con crédito de la cuenta y tarjeta (US-07.07), como pieza aparte para
// que lo usen la compra de entradas y el pedido del Candy (US-08.06) con las
// mismas reglas.
//
// El crédito cubre hasta el total y el resto va con tarjeta (AC-07.07.01); si
// alcanza, no se piden datos de tarjeta. La tarjeta se valida acá y no se manda
// a ningún lado (AC-07.07.02). Al tocar Pagar con todo válido avisa con pagar()
// cuánto crédito usar; el cobro lo hace quien lo usa.
@Component({
  selector: 'nc-formulario-pago',
  imports: [CurrencyPipe, ReactiveFormsModule, CampoTexto, ErrorCampo],
  templateUrl: './formulario-pago.html',
  styleUrl: './formulario-pago.css',
})
export class FormularioPago {
  total = input.required<number>();
  saldo = input(0);
  pagando = input(false);

  // El crédito a usar, ya limitado al total.
  pagar = output<number>();

  usarCredito = signal(false);

  // El número admite espacios cada cuatro dígitos, que es como viene impreso.
  tarjeta = new FormGroup({
    numero: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4} ?\d{4} ?\d{4} ?\d{4}$/)],
    }),
    titular: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    vencimiento: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(PATRON_VENCIMIENTO),
        tarjetaNoVencida(() => new Date()),
      ],
    }),
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{3}$/)],
    }),
  });

  credito = computed(() => {
    let credito = 0;

    if (this.usarCredito()) {
      credito = Math.min(this.saldo(), this.total());
    }

    return credito;
  });

  aTarjeta = computed(() => {
    const resto = this.total() - this.credito();

    return resto;
  });

  pideTarjeta = computed(() => {
    let pide = false;

    if (this.aTarjeta() > 0) {
      pide = true;
    }

    return pide;
  });

  alternarCredito(): void {
    const usar = !this.usarCredito();

    this.usarCredito.set(usar);
  }

  confirmar(): void {
    if (this.pideTarjeta() && this.tarjeta.invalid) {
      this.tarjeta.markAllAsTouched();
    } else if (this.pagando() === false) {
      this.pagar.emit(this.credito());
    }
  }
}
