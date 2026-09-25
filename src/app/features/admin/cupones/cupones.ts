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
      const lista = await this.cuponesS.listar();
      this.cupones.set(lista);
    } catch {
      this.error.set('No se pudo cargar el listado de cupones. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Un cupón activo pero fuera de fecha tampoco se acepta, por eso lo muestro aparte.
  estado(cupon: Cupon): string {
    const ahora = new Date();

    let bandera = 'Activo';

    if (cupon.activo === false) {
      bandera = 'Desactivado';
    } else if (cuponVigente(cupon, ahora) === false) {
      bandera = 'Vencido';
    }

    return bandera;
  }

  claseEstado(cupon: Cupon): string {
    const estado = this.estado(cupon);

    let clase = 'nc-badge nc-badge--neutral';

    if (estado === 'Activo') {
      clase = 'nc-badge nc-badge--success';
    } else if (estado === 'Vencido') {
      clase = 'nc-badge nc-badge--warning';
    }

    return clase;
  }

  async cambiarActivo(cupon: Cupon): Promise<void> {
    let activo = false;

    if (cupon.activo === false) {
      activo = true;
    }

    this.cambiando.set(cupon.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      await this.cuponesS.cambiarActivo(cupon.id, activo);
      const lista = cuponesConActivo(this.cupones(), cupon.id, activo);
      this.cupones.set(lista);
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

// ─── Auxiliares ─────────────────────────────────────────────────────

function cuponesConActivo(lista: Cupon[], id: string, activo: boolean): Cupon[] {
  const cupones: Cupon[] = [];

  for (const cupon of lista) {
    if (cupon.id === id) {
      cupones.push({ ...cupon, activo });
    } else {
      cupones.push(cupon);
    }
  }

  return cupones;
}
