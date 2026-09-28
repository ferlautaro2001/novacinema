import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
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
import { CompraEstado } from '../compra-estado';

// El resumen de la compra, antes de pagar (US-07.06). Muestra las entradas
// elegidas y aplica el descuento que corresponde: el de primera compra solo, o
// el cupón que ingrese el cliente si es mayor. Nunca los dos (AC-07.06.03).
//
// El pago en sí llega con US-07.07. El descuento elegido queda en CompraEstado
// para que ese paso lo guarde en compra_cupones.
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
  compra = inject(CompraEstado);

  estado = signal<EstadoPantalla>('cargando');
  mensaje = signal('');
  // El cupón de primera compra, solo si el cliente todavía puede usarlo.
  primeraCompra = signal<Cupon | null>(null);
  ingresado = signal<Cupon | null>(null);
  errorCupon = signal('');
  aplicando = signal(false);

  // Un grupo aunque tenga un solo campo: sin [formGroup] el <form> no lo maneja
  // Angular y Enter recargaría la página.
  form = new FormGroup({
    codigo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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

    if (funcion !== null && funcion.id === id && entradas.length !== 0) {
      haySeleccion = true;
    }

    if (haySeleccion) {
      await this.cargarPrimeraCompra();
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

  private async cargarPrimeraCompra(): Promise<void> {
    const usuario = this.auth.usuario();

    try {
      if (usuario !== null) {
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
