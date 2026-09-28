import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
import { CompraRechazada, ComprasService } from '../../../core/data/compras-service';
import { CreditoService } from '../../../core/data/credito-service';
import { CuponesService } from '../../../core/data/cupones-service';
import { UsuariosService } from '../../../core/data/usuarios-service';
import type { Cupon } from '../../../core/models/precio';
import {
  aplicarCupon,
  cuponVigente,
  elegirCupon,
  motivoCuponRechazado,
  type DescuentoElegido,
} from '../../../core/reglas/descuentos';
import { edadEn } from '../../../core/reglas/edad';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { CargaConsulta } from '../../../shared/ui/carga-consulta/carga-consulta';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import { PATRON_VENCIMIENTO, tarjetaNoVencida } from '../../../shared/validadores/tarjeta';
import { CompraEstado } from '../compra-estado';

// El resumen de la compra y el pago. Muestra las entradas elegidas y aplica el
// descuento que corresponde (US-07.06): el de primera compra solo, o el cupón
// que ingrese el cliente si es mayor. Nunca los dos (AC-07.06.03).
//
// Después se paga (US-07.07): primero con el crédito de la cuenta, si el
// cliente lo elige, y el resto con tarjeta. Los datos de la tarjeta se validan
// acá y no se mandan a ningún lado: no hay procesador de pagos.
type EstadoPantalla = 'cargando' | 'listo' | 'sin-seleccion' | 'error';

@Component({
  selector: 'nc-pagar',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    CampoTexto,
    CargaConsulta,
    ErrorCampo,
  ],
  templateUrl: './pagar.html',
  styleUrl: './pagar.css',
})
export class Pagar implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private cuponesService = inject(CuponesService);
  private usuariosService = inject(UsuariosService);
  private creditoService = inject(CreditoService);
  private comprasService = inject(ComprasService);
  private router = inject(Router);
  compra = inject(CompraEstado);

  estado = signal<EstadoPantalla>('cargando');
  mensaje = signal('');
  // El cupón de primera compra, solo si el cliente todavía puede usarlo.
  primeraCompra = signal<Cupon | null>(null);
  ingresado = signal<Cupon | null>(null);
  errorCupon = signal('');
  aplicando = signal(false);

  saldo = signal(0);
  usarCredito = signal(false);
  pagando = signal(false);
  errorPago = signal('');
  // Si una butaca se vendió mientras pagaba, se ofrece volver al mapa.
  butacaPerdida = signal(false);

  // Un grupo aunque tenga un solo campo: sin [formGroup] el <form> no lo maneja
  // Angular y Enter recargaría la página.
  form = new FormGroup({
    codigo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  // Los datos de la tarjeta (AC-07.07.02). El número admite espacios cada
  // cuatro dígitos, que es como viene impreso.
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

  subtotal = computed(() => {
    let suma = 0;

    for (const entrada of this.compra.entradas()) {
      suma = suma + entrada.precio;
    }

    return suma;
  });

  descuento = computed(() => {
    const cupon = elegirCupon(this.primeraCompra(), this.ingresado());

    let descuento: DescuentoElegido | null = null;

    if (cupon !== null) {
      descuento = aplicarCupon(cupon, this.subtotal());
    }

    return descuento;
  });

  total = computed(() => {
    const descuento = this.descuento();

    let total = this.subtotal();

    if (descuento !== null) {
      total = total - descuento.monto;
    }

    return total;
  });

  // El crédito cubre hasta el total, nunca más (AC-07.07.01).
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

  // Si el crédito cubre todo no se piden datos de tarjeta.
  pideTarjeta = computed(() => {
    let pide = false;

    if (this.aTarjeta() > 0) {
      pide = true;
    }

    return pide;
  });

  // Aclara por qué se aplica uno solo cuando hay dos en juego (AC-07.06.03).
  nota = computed(() => {
    const primera = this.primeraCompra();
    const ingresado = this.ingresado();
    const descuento = this.descuento();

    let nota = '';

    if (primera !== null && ingresado !== null && descuento !== null) {
      if (descuento.cuponId === ingresado.id) {
        nota =
          'Se aplica un solo descuento por compra. Tu descuento de primera compra queda para la próxima.';
      } else {
        nota = `Se aplica un solo descuento por compra y el de primera compra es mayor que ${ingresado.codigo}.`;
      }
    }

    return nota;
  });

  // Cada cambio del descuento queda guardado para el pago.
  private guardarDescuento = effect(() => {
    const descuento = this.descuento();

    this.compra.guardarDescuento(descuento);
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('funcionId');
    const funcion = this.compra.funcion();
    const entradas = this.compra.entradas();

    let haySeleccion = false;

    // Una compra ya confirmada no se vuelve a pagar, aunque se vuelva atrás.
    if (
      funcion !== null &&
      funcion.id === id &&
      entradas.length !== 0 &&
      this.compra.confirmada() === null
    ) {
      haySeleccion = true;
    }

    if (haySeleccion) {
      await this.cargarResumen();
    } else {
      this.estado.set('sin-seleccion');
    }
  }

  async aplicar(): Promise<void> {
    const codigo = this.form.controls.codigo.value.trim().toUpperCase();

    this.errorCupon.set('');

    if (codigo === '') {
      this.form.controls.codigo.markAsTouched();
    } else {
      this.aplicando.set(true);

      try {
        await this.validarCupon(codigo);
      } catch {
        this.errorCupon.set('No se pudo revisar el cupón. Probá de nuevo.');
      }

      this.aplicando.set(false);
    }
  }

  quitar(): void {
    this.ingresado.set(null);
    this.errorCupon.set('');
    this.form.reset();
  }

  alternarCredito(): void {
    const usar = !this.usarCredito();

    this.usarCredito.set(usar);
  }

  async pagar(): Promise<void> {
    const funcion = this.compra.funcion();
    const usuario = this.auth.usuario();

    this.errorPago.set('');
    this.butacaPerdida.set(false);

    if (this.pideTarjeta() && this.tarjeta.invalid) {
      this.tarjeta.markAllAsTouched();
    } else if (funcion !== null && usuario !== null) {
      this.pagando.set(true);
      await this.registrar(funcion.id, usuario.id);
      this.pagando.set(false);
    }
  }

  private async registrar(funcionId: string, usuarioId: string): Promise<void> {
    const butacas: string[] = [];

    for (const entrada of this.compra.entradas()) {
      butacas.push(entrada.id);
    }

    let cuponId: string | null = null;
    const descuento = this.descuento();

    if (descuento !== null) {
      cuponId = descuento.cuponId;
    }

    try {
      const registrada = await this.comprasService.registrar({
        usuarioId,
        funcionId,
        butacas,
        adulto: this.compra.adulto(),
        cuponId,
        creditoDisponible: this.credito(),
      });

      this.compra.confirmar(registrada);
      this.router.navigate(['/comprar', funcionId, 'confirmacion']);
    } catch (e) {
      this.mostrarRechazo(e);
    }
  }

  private mostrarRechazo(e: unknown): void {
    let mensaje = 'No se pudo completar el pago. No se cobró nada: probá de nuevo.';

    if (e instanceof CompraRechazada) {
      mensaje = e.message;

      if (mensaje.includes('Elegí otra butaca')) {
        this.butacaPerdida.set(true);
      }
    }

    this.errorPago.set(mensaje);
  }

  private async cargarResumen(): Promise<void> {
    const usuario = this.auth.usuario();

    try {
      if (usuario !== null) {
        const saldo = await this.creditoService.saldo(usuario.id);

        this.saldo.set(saldo);

        const cupon = await this.cuponesService.primeraCompra();
        const usada = await this.cuponesService.primeraCompraUsada(usuario.id);
        const ahora = new Date();

        if (cupon.activo && cuponVigente(cupon, ahora) && usada === false && cupon.porcentaje > 0) {
          this.primeraCompra.set(cupon);
        }
      }

      this.estado.set('listo');
    } catch {
      this.estado.set('error');
      this.mensaje.set('No se pudo armar el resumen de la compra. Probá de nuevo.');
    }
  }

  // Vigencia y edad se revisan acá para avisar antes de pagar (AC-07.06.02);
  // la base las vuelve a revisar al guardar el cupón, junto con los usos.
  private async validarCupon(codigo: string): Promise<void> {
    const cupon = await this.cuponesService.buscarPorCodigo(codigo);

    if (cupon === null) {
      this.errorCupon.set('No encontramos ese cupón. Revisá el código.');
    } else if (cupon.tipo === 'primera_compra') {
      this.errorCupon.set('El descuento de primera compra se aplica solo, sin código.');
    } else {
      const edad = await this.miEdad();
      const motivo = motivoCuponRechazado(cupon, edad, new Date());

      if (motivo === null) {
        this.ingresado.set(cupon);
      } else {
        this.errorCupon.set(motivo);
      }
    }
  }

  // Sin fecha de nacimiento la edad queda en 0: un cupón con edad mínima se
  // rechaza, que es lo mismo que hace la base.
  private async miEdad(): Promise<number> {
    const usuario = this.auth.usuario();

    let edad = 0;

    if (usuario !== null) {
      const nacimiento = await this.usuariosService.miNacimiento(usuario.id);

      if (nacimiento !== null) {
        edad = edadEn(nacimiento, new Date());
      }
    }

    return edad;
  }
}
