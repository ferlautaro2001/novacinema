import { inject, Service } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Supabase } from './supabase-client';

// Lo que viaja en SELECCIONAR y LIBERAR: quién es (un id por pestaña, no el
// usuario, para no publicar quién compra) y qué butacas del mapa toma o suelta.
export interface MensajeSeleccion {
  cliente: string;
  butacas: string[];
}

// Lo que la pantalla hace con cada evento del canal.
export interface AvisosButacas {
  alCambiarOcupacion: () => void;
  alSeleccionar: (mensaje: MensajeSeleccion) => void;
  alLiberar: (mensaje: MensajeSeleccion) => void;
  alIrse: (cliente: string) => void;
  alConectar: () => void;
}

// El canal de tiempo real del mapa de butacas (US-07.05), uno por función.
//
// La ocupación no se escucha con postgres_changes sobre entradas: la RLS de
// entradas solo deja ver las propias, así que la venta de otro cliente nunca
// llegaría. La publica el trigger emitir_cambio_butaca por Broadcast en este
// mismo canal ("butacas:<funcion_id>", evento "ocupacion") cuando una entrada se
// inserta o se anula. El aviso trae el uuid de la butaca, no el id del mapa, así
// que la pantalla vuelve a leer las ocupadas en vez de traducirlo.
//
// "En selección" viaja por el mismo canal con SELECCIONAR y LIBERAR, que manda
// cada navegador. No pasa por la base: es un aviso entre pantallas abiertas, y
// el índice único de entradas es lo que de verdad impide vender dos veces.
//
// Cerrar la pestaña corta el socket antes de que salga el LIBERAR, así que cada
// pestaña además se anota en Presence con su id: cuando Supabase avisa que se
// fue, las demás sueltan lo que tenía elegido.
@Service()
export class RealtimeButacas {
  private supS = inject(Supabase);

  conectar(funcionId: string, cliente: string, avisos: AvisosButacas): RealtimeChannel {
    const canal = this.supS.Sup.channel(`butacas:${funcionId}`, {
      config: { broadcast: { self: false }, presence: { key: cliente } },
    })
      .on('broadcast', { event: 'ocupacion' }, () => avisos.alCambiarOcupacion())
      .on('broadcast', { event: 'SELECCIONAR' }, (mensaje) =>
        avisos.alSeleccionar(leerMensaje(mensaje['payload'])),
      )
      .on('broadcast', { event: 'LIBERAR' }, (mensaje) =>
        avisos.alLiberar(leerMensaje(mensaje['payload'])),
      )
      .on('presence', { event: 'leave' }, (salida) => avisos.alIrse(salida.key))
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') {
          canal.track({});
          avisos.alConectar();
        }
      });

    return canal;
  }

  seleccionar(canal: RealtimeChannel, mensaje: MensajeSeleccion): void {
    canal.send({ type: 'broadcast', event: 'SELECCIONAR', payload: mensaje });
  }

  liberar(canal: RealtimeChannel, mensaje: MensajeSeleccion): void {
    canal.send({ type: 'broadcast', event: 'LIBERAR', payload: mensaje });
  }

  async desconectar(canal: RealtimeChannel): Promise<void> {
    await this.supS.Sup.removeChannel(canal);
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// El payload llega sin tipo porque lo manda otro navegador. Si le falta algo se
// toma vacío: un mensaje roto no bloquea ninguna butaca.
function leerMensaje(payload: Record<string, unknown>): MensajeSeleccion {
  let cliente = '';
  const butacas: string[] = [];

  if (typeof payload['cliente'] === 'string') {
    cliente = payload['cliente'];
  }

  const recibidas = payload['butacas'];

  if (Array.isArray(recibidas)) {
    for (const id of recibidas) {
      if (typeof id === 'string') {
        butacas.push(id);
      }
    }
  }

  const mensaje: MensajeSeleccion = { cliente, butacas };

  return mensaje;
}
