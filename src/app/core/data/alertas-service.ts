import { inject, Service } from '@angular/core';
import type { NotificacionPorCrear } from '../models/pelicula';
import { ventaAbierta } from '../reglas/preventa';
import { Supabase } from '../supabase/supabase-client';

// Tipo de la notificación que avisa que abrió la venta de una película con alerta.
export const TIPO_VENTA_ABIERTA = 'venta_abierta';

@Service()
export class AlertasService {
  private supS = inject(Supabase);

  async estaActiva(usuarioId: string, peliculaId: string): Promise<boolean> {
    const { data, error } = await this.supS.Sup.from('alertas_estreno')
      .select('pelicula_id')
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    let activa = false;

    if (data !== null) {
      activa = true;
    }

    return activa;
  }

  async activar(usuarioId: string, peliculaId: string): Promise<void> {
    const { error } = await this.supS.Sup.from('alertas_estreno').insert({
      usuario_id: usuarioId,
      pelicula_id: peliculaId,
    });
    if (error !== null) {
      throw error;
    }
  }

  async desactivar(usuarioId: string, peliculaId: string): Promise<void> {
    const { error } = await this.supS.Sup.from('alertas_estreno')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId);
    if (error !== null) {
      throw error;
    }
  }

  // Lo llama el admin al guardar la preventa o programar funciones: si la venta de la
  // película ya abrió, avisa a todos los que tienen la alerta y todavía no fueron avisados.
  async notificarAperturaDeVenta(peliculaId: string): Promise<void> {
    const titulo = await this.tituloSiVentaAbierta(peliculaId);

    if (titulo !== null) {
      // Primero marco las alertas y después aviso solo a las que marqué yo: así, si el
      // usuario ingresa al mismo tiempo, el aviso no sale dos veces.
      const ahora = new Date().toISOString();
      const { data, error } = await this.supS.Sup.from('alertas_estreno')
        .update({ notificada_en: ahora })
        .eq('pelicula_id', peliculaId)
        .is('notificada_en', null)
        .select('usuario_id');
      if (error !== null) {
        throw error;
      }

      const notificaciones: NotificacionPorCrear[] = [];

      for (const alerta of data) {
        const notificacion = avisoDeVenta(alerta.usuario_id, peliculaId, titulo);
        notificaciones.push(notificacion);
      }

      await this.insertarNotificaciones(notificaciones);
    }
  }

  // Lo llama la sesión al ingresar: revisa las alertas propias cuya venta abrió
  // mientras el usuario no estaba (por ejemplo, porque llegó la fecha de apertura).
  async notificarPendientesDelUsuario(usuarioId: string): Promise<void> {
    const { data, error } = await this.supS.Sup.from('alertas_estreno')
      .select('pelicula_id')
      .eq('usuario_id', usuarioId)
      .is('notificada_en', null);
    if (error !== null) {
      throw error;
    }

    const notificaciones: NotificacionPorCrear[] = [];

    for (const alerta of data) {
      const titulo = await this.tituloSiVentaAbierta(alerta.pelicula_id);

      if (titulo !== null) {
        const marcada = await this.marcarNotificada(usuarioId, alerta.pelicula_id);

        if (marcada) {
          const notificacion = avisoDeVenta(usuarioId, alerta.pelicula_id, titulo);
          notificaciones.push(notificacion);
        }
      }
    }

    await this.insertarNotificaciones(notificaciones);
  }

  // La venta está abierta cuando llegó la fecha de apertura (preventa o estreno) y la
  // película tiene al menos una función sin cancelar. Devuelvo el título, o null si no abrió.
  private async tituloSiVentaAbierta(peliculaId: string): Promise<string | null> {
    const { data: pelicula, error: errorPelicula } = await this.supS.Sup.from('peliculas')
      .select('titulo, fecha_estreno')
      .eq('id', peliculaId)
      .single();
    if (errorPelicula !== null) {
      throw errorPelicula;
    }

    const { data: preventa, error: errorPreventa } = await this.supS.Sup.from('preventas')
      .select('habilitada, dias_antes')
      .eq('pelicula_id', peliculaId)
      .maybeSingle();
    if (errorPreventa !== null) {
      throw errorPreventa;
    }

    const { count, error: errorFunciones } = await this.supS.Sup.from('funciones')
      .select('id', { count: 'exact', head: true })
      .eq('pelicula_id', peliculaId)
      .neq('estado', 'cancelada');
    if (errorFunciones !== null) {
      throw errorFunciones;
    }

    const ahora = new Date();
    const abiertaPorFecha = ventaAbierta(pelicula.fecha_estreno, preventa, ahora);

    let titulo: string | null = null;

    if (abiertaPorFecha && count !== null && count > 0) {
      titulo = pelicula.titulo;
    }

    return titulo;
  }

  private async marcarNotificada(usuarioId: string, peliculaId: string): Promise<boolean> {
    const ahora = new Date().toISOString();
    const { data, error } = await this.supS.Sup.from('alertas_estreno')
      .update({ notificada_en: ahora })
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId)
      .is('notificada_en', null)
      .select('pelicula_id');
    if (error !== null) {
      throw error;
    }

    let marcada = false;

    if (data.length > 0) {
      marcada = true;
    }

    return marcada;
  }

  private async insertarNotificaciones(notificaciones: NotificacionPorCrear[]): Promise<void> {
    if (notificaciones.length > 0) {
      const { error } = await this.supS.Sup.from('notificaciones').insert(notificaciones);
      if (error !== null) {
        throw error;
      }
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function avisoDeVenta(usuarioId: string, peliculaId: string, titulo: string): NotificacionPorCrear {
  const notificacion: NotificacionPorCrear = {
    usuario_id: usuarioId,
    pelicula_id: peliculaId,
    tipo: TIPO_VENTA_ABIERTA,
    titulo: 'Venta abierta',
    mensaje: `¡Ya podés comprar entradas para ${titulo}!`,
  };

  return notificacion;
}
