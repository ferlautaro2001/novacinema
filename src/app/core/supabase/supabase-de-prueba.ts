import type {
  AuthChangeEvent,
  AuthResponse,
  Session,
  SignUpWithPasswordCredentials,
} from '@supabase/supabase-js';
import { Supabase } from './supabase-client';

type OyenteSesion = (evento: AuthChangeEvent, sesion: Session | null) => void;

// Solo para tests: reemplaza al cliente real de Supabase para que ninguna prueba
// salga a la red ni dependa de lo que haya en localStorage. `emitir` simula los
// eventos de sesión; si `sesionInicial` no es `false`, el INITIAL_SESSION se
// emite apenas alguien se suscribe, como hace Supabase con una sesión guardada.
// `auth` queda expuesto para que cada test defina qué responden signUp y compañía.
export function supabaseDePrueba(sesionInicial: Session | null | false = null) {
  const oyentes: OyenteSesion[] = [];
  const auth = {
    onAuthStateChange(oyente: OyenteSesion) {
      oyentes.push(oyente);
      if (sesionInicial !== false) oyente('INITIAL_SESSION', sesionInicial);
      return { data: { subscription: { id: 'prueba', unsubscribe: () => undefined } } };
    },
    signUp: (_credenciales: SignUpWithPasswordCredentials): Promise<AuthResponse> =>
      Promise.resolve({ data: { user: null, session: null }, error: null }),
  };
  return {
    provider: { provide: Supabase, useValue: { Sup: { auth } } },
    auth,
    emitir: (evento: AuthChangeEvent, sesion: Session | null) =>
      oyentes.forEach((oyente) => oyente(evento, sesion)),
  };
}
