import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
import { CandyService, PedidoRechazado } from '../../../core/data/candy-service';
import { ComprasService } from '../../../core/data/compras-service';
import { CreditoService } from '../../../core/data/credito-service';
import { datosDelComprobante, descargarEntradaPdf } from '../../../core/documentos/entrada-pdf';
import type { CompraVigente, PedidoPagado } from '../../../core/models/candy';
import { CodigoQr } from '../../../shared/ui/codigo-qr/codigo-qr';
import { CargaConsulta } from '../../../shared/ui/carga-consulta/carga-consulta';
import { FormularioPago } from '../../compra/formulario-pago/formulario-pago';
import { PedidoEstado } from '../pedido-estado';
import { ResumenPedido } from '../resumen-pedido/resumen-pedido';

type EstadoPantalla = 'cargando' | 'listo' | 'sin-compra' | 'pagado' | 'error';

// Lo que quedó del pedido pagado, para el comprobante: el pedido se vacía al
// pagar.
interface PedidoConfirmado {
  compra: CompraVigente;
  pago: PedidoPagado;
  lineas: string[];
}

// Pagar un pedido del Candy sobre una compra ya hecha (US-08.05 y US-08.06).
//
// El pedido se vincula a una compra de entradas propia, pagada y con la
// función sin terminar (AC-08.05.01); si no hay ninguna, se avisa. Se paga con
// las mismas reglas de crédito y tarjeta que las entradas (AC-08.06.01) y
// queda "Pendiente de retiro" con el mismo código y QR de la compra
// (AC-08.05.02). El PDF de la compra ahora lista el pedido (AC-08.06.02).
@Component({
  selector: 'nc-pagar-pedido',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    CargaConsulta,
    CodigoQr,
    FormularioPago,
    ResumenPedido,
  ],
  templateUrl: './pagar-pedido.html',
  styleUrl: './pagar-pedido.css',
})
export class PagarPedido implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private candy = inject(CandyService);
  private compras = inject(ComprasService);
  private creditos = inject(CreditoService);
  pedido = inject(PedidoEstado);

  private qr = viewChild(CodigoQr);

  estado = signal<EstadoPantalla>('cargando');
  vigentes = signal<CompraVigente[]>([]);
  elegida = signal<string | null>(null);
  saldo = signal(0);
  pagando = signal(false);
  error = signal('');
  confirmado = signal<PedidoConfirmado | null>(null);
  descargando = signal(false);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  elegir(compraId: string): void {
    this.elegida.set(compraId);
  }

  // nc-formulario-pago ya validó la tarjeta y avisa cuánto crédito usar.
  async pagar(credito: number): Promise<void> {
    const compraId = this.elegida();
    const compra = this.compraElegida();

    this.error.set('');

    if (compraId !== null && compra !== null && this.pedido.items().length !== 0) {
      this.pagando.set(true);

      try {
        await this.pagarSobre(compra, credito);
      } catch (e) {
        this.mostrarRechazo(e);
      } finally {
        this.pagando.set(false);
      }
    }
  }

  async descargar(): Promise<void> {
    const confirmado = this.confirmado();
    const qr = this.qr();

    if (confirmado !== null && qr !== undefined && this.descargando() === false) {
      this.descargando.set(true);
      this.error.set('');

      try {
        const comprobante = await this.compras.comprobante(confirmado.compra.id);
        const datos = datosDelComprobante(comprobante);
        const imagen = qr.imagen();

        descargarEntradaPdf(datos, imagen);
      } catch {
        this.error.set('No se pudo armar el PDF. Probá de nuevo.');
      } finally {
        this.descargando.set(false);
      }
    }
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────

  private async cargar(): Promise<void> {
    const usuario = this.auth.usuario();

    try {
      if (usuario !== null) {
        const vigentes = await this.candy.comprasVigentes(usuario.id);
        const saldo = await this.creditos.saldo(usuario.id);

        this.vigentes.set(vigentes);
        this.saldo.set(saldo);
        this.elegirInicial(vigentes);
      }

      let estado: EstadoPantalla = 'listo';

      if (this.vigentes().length === 0) {
        estado = 'sin-compra';
      }

      this.estado.set(estado);
    } catch {
      this.estado.set('error');
    }
  }

  // La compra que vino en ?compra= (desde la confirmación) si sigue vigente; si
  // no, la más reciente.
  private elegirInicial(vigentes: CompraVigente[]): void {
    const pedida = this.route.snapshot.queryParamMap.get('compra');

    let elegida: string | null = null;

    for (const compra of vigentes) {
      if (compra.id === pedida) {
        elegida = compra.id;
      }
    }

    if (elegida === null && vigentes.length !== 0) {
      elegida = vigentes[0].id;
    }

    this.elegida.set(elegida);
  }

  private compraElegida(): CompraVigente | null {
    const id = this.elegida();

    let elegida: CompraVigente | null = null;

    for (const compra of this.vigentes()) {
      if (compra.id === id) {
        elegida = compra;
      }
    }

    return elegida;
  }

  private async pagarSobre(compra: CompraVigente, credito: number): Promise<void> {
    const items: { productoId: string; cantidad: number }[] = [];
    const lineas: string[] = [];

    for (const item of this.pedido.items()) {
      items.push({ productoId: item.producto.id, cantidad: item.cantidad });
      lineas.push(`${item.cantidad} × ${item.producto.nombre}`);
    }

    let usarCredito = false;

    if (credito > 0) {
      usarCredito = true;
    }

    const pago = await this.candy.pagarPedido(compra.id, items, usarCredito);

    this.confirmado.set({ compra, pago, lineas });
    this.pedido.limpiar();
    this.estado.set('pagado');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private mostrarRechazo(e: unknown): void {
    let mensaje = 'No se pudo completar el pedido. No se cobró nada: probá de nuevo.';

    if (e instanceof PedidoRechazado) {
      mensaje = e.message;
    }

    this.error.set(mensaje);
  }
}
