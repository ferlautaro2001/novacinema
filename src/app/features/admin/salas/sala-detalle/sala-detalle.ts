import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalasService } from '../../../../core/data/salas-service';
import type { Sala } from '../../../../core/models/sala';
import { MapaButacasComponent } from '../../../../shared/ui/mapa-butacas/mapa-butacas';

@Component({
  selector: 'nc-sala-detalle',
  standalone: true,
  imports: [RouterLink, MapaButacasComponent],
  templateUrl: './sala-detalle.html',
  styleUrl: './sala-detalle.css',
})
export class SalaDetalle implements OnInit {
  private ruta = inject(ActivatedRoute);
  private salasService = inject(SalasService);

  sala = signal<Sala | null>(null);
  cargando = signal<boolean>(true);
  error = signal<string>('');

  async ngOnInit(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No se especificó la sala');
      this.cargando.set(false);
      return;
    }

    try {
      const data = await this.salasService.buscar(id);
      if (!data) {
        this.error.set('No se encontró la sala');
      } else {
        this.sala.set(data);
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Error al cargar la sala');
    } finally {
      this.cargando.set(false);
    }
  }
}
