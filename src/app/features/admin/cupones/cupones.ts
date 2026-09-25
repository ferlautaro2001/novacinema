import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CuponesService } from '../../../core/data/cupones-service';
import type { Cupon } from '../../../core/models/precio';
import { cuponVigente } from '../../../core/reglas/descuentos';

@Component({
  selector: 'nc-cupones',
  imports: [DatePipe, RouterLink],
  templateUrl: './cupones.html',
  styleUrl: './cupones.css',
})
export class Cupones implements OnInit {
  private cuponesS = inject(CuponesService);

  cupones = signal<Cupon[]>([]);
  cargando = signal(true);
  cambiando = signal<string | null>(null);
  aviso = signal<string | null>(null);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.cupones.set(await this.cuponesS.listar());
    } catch {
      this.error.set('No se pudo cargar el listado de cupones. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Un cupón activo pero fuera de fecha tampoco se acepta, por eso lo muestro aparte.
  estado(cupon: Cupon): string {
    if (!cupon.activo) {
      return 'Desactivado';
    }
    if (!cuponVigente(cupon, new Date())) {
      return 'Vencido';
    }
    return 'Activo';
  }

  claseEstado(cupon: Cupon): string {
    const estado = this.estado(cupon);
    if (estado === 'Activo') {
      return 'nc-badge nc-badge--success';
    }
    if (estado === 'Vencido') {
      return 'nc-badge nc-badge--warning';
    }
    return 'nc-badge nc-badge--neutral';
  }

  async cambiarActivo(cupon: Cupon): Promise<void> {
    const activo = !cupon.activo;
    this.cambiando.set(cupon.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      await this.cuponesS.cambiarActivo(cupon.id, activo);
      this.cupones.update((lista) => lista.map((c) => (c.id === cupon.id ? { ...c, activo } : c)));
      if (activo) {
        this.aviso.set(`${cupon.codigo} activado.`);
      } else {
        this.aviso.set(`${cupon.codigo} desactivado. Ya no se acepta en las compras.`);
      }
    } catch {
      this.error.set(`No se pudo cambiar ${cupon.codigo}. Probá de nuevo.`);
    } finally {
      this.cambiando.set(null);
    }
  }
}
