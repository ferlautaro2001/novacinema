import { inject, Service, signal } from '@angular/core';
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import type { Notificacion } from '../models/pelicula';
import { Supabase } from '../supabase/supabase-client';
import { AlertasService, TIPO_VENTA_ABIERTA } from './alertas-service';

// Avisos dentro del sitio (US-06.08). La sesión llama a iniciar() al ingresar y a
// detener() al salir; la campana del encabezado muestra lo que queda en `avisos`.
@Service()
export class NotificacionesService {
  private supS = inject(Supabase);
  private alertas = inject(AlertasService);

  avisos = signal<Notificacion[]>([]);

  private canal: RealtimeChannel | null = null;

  async iniciar(usuarioId: string): Promise<void> {
    await this.detener();

    try {
      await this.alertas.notificarPendientesDelUsuario(usuarioId);
    } catch {
      // Si la revisión falla, igual muestro las que ya estaban creadas.
    }

    const { data, error } = await this.supS.Sup.from('notificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', TIPO_VENTA_ABIERTA)
      .is('leida_en', null)
      .order('creada_en');
    if (error !== null) {
      throw error;
    }

    for (const notificacion of data) {
      await this.mostrar(notificacion);
    }

    this.canal = this.supS.Sup.channel(`notificaciones-${usuarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (cambio: RealtimePostgresInsertPayload<Notificacion>) => this.alRecibir(cambio),
      )
      .subscribe();
  }

  async detener(): Promise<void> {
    const canal = this.canal;

    if (canal !== null) {
      this.canal = null;
      await this.supS.Sup.removeChannel(canal);
    }

    this.avisos.set([]);
  }

  // Lo saca de la pantalla; en la base ya quedó leído cuando se mostró.
  descartar(id: string): void {
    const restantes = this.avisos().filter(esOtroAviso(id));

    this.avisos.set(restantes);
  }

  private alRecibir(cambio: RealtimePostgresInsertPayload<Notificacion>): void {
    const notificacion = cambio.new;

    if (notificacion.tipo === TIPO_VENTA_ABIERTA) {
      this.mostrar(notificacion);
    }
  }

  // Al verse se marca leída, así no vuelve a aparecer en el siguiente ingreso.
  private async mostrar(notificacion: Notificacion): Promise<void> {
    const actuales = this.avisos();
    const nuevos = [...actuales, notificacion];

    this.avisos.set(nuevos);

    const ahora = new Date().toISOString();
    const { error } = await this.supS.Sup.from('notificaciones')
      .update({ leida_en: ahora })
      .eq('id', notificacion.id);
    if (error !== null) {
      throw error;
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function esOtroAviso(id: string): (notificacion: Notificacion) => boolean {
  function tieneOtroId(notificacion: Notificacion): boolean {
    let esOtro = false;

    if (notificacion.id !== id) {
      esOtro = true;
    }

    return esOtro;
  }

  return tieneOtroId;
}
