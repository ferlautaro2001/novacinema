import {
  AuthError,
  type AuthChangeEvent,
  type AuthResponse,
  type AuthTokenResponsePassword,
  type Session,
  type SignInWithPasswordCredentials,
  type SignUpWithPasswordCredentials,
} from '@supabase/supabase-js';
import { Supabase } from './supabase-client';

type OyenteSesion = (evento: AuthChangeEvent, sesion: Session | null) => void;

export interface PerfilDePrueba {
  nombre: string;
  apellido: string;
  rol: { codigo: string };
}

// Solo para tests: reemplaza al cliente real de Supabase para que ninguna prueba
// salga a la red ni dependa de lo que haya en localStorage. `emitir` simula los
// eventos de sesión; si `sesionInicial` no es `false`, el INITIAL_SESSION se
// emite apenas alguien se suscribe, como hace Supabase con una sesión guardada.
// `auth` queda expuesto para que cada test defina qué responden signUp y compañía;
// `perfiles` es lo que devuelve la tabla usuarios, por id.
export function supabaseDePrueba(sesionInicial: Session | null | false = null) {
  const oyentes: OyenteSesion[] = [];
  const perfiles = new Map<string, PerfilDePrueba>();
  // La sesión que hay guardada en el navegador en cada momento.
  let sesionGuardada: Session | null = sesionInicial || null;
  const auth = {
    onAuthStateChange(oyente: OyenteSesion) {
      oyentes.push(oyente);
      if (sesionInicial !== false) oyente('INITIAL_SESSION', sesionInicial);
      return { data: { subscription: { id: 'prueba', unsubscribe: () => undefined } } };
    },
    signUp: (_credenciales: SignUpWithPasswordCredentials): Promise<AuthResponse> =>
      Promise.resolve({ data: { user: null, session: null }, error: null }),
    // Por defecto, credenciales incorrectas: cada test define su respuesta.
    signInWithPassword: (
      _credenciales: SignInWithPasswordCredentials,
    ): Promise<AuthTokenResponsePassword> =>
      Promise.resolve({
        data: { user: null, session: null },
        error: new AuthError('Invalid login credentials', 400, 'invalid_credentials'),
      }),
    getSession: () => Promise.resolve({ data: { session: sesionGuardada }, error: null }),
    signOut: (): Promise<{ error: AuthError | null }> => {
      sesionGuardada = null;
      oyentes.forEach((oyente) => oyente('SIGNED_OUT', null));
      return Promise.resolve({ error: null });
    },
  };
  // Solo cubre la consulta del perfil: from('usuarios').select(...).eq('id', x).single()
  const from = (_tabla: string) => {
    let id = '';
    const consulta = {
      select: () => consulta,
      eq: (_columna: string, valor: string) => {
        id = valor;
        return consulta;
      },
      single: () => {
        const perfil = perfiles.get(id);
        return Promise.resolve(
          perfil
            ? { data: perfil, error: null }
            : { data: null, error: { code: 'PGRST116', message: 'sin filas' } },
        );
      },
    };
    return consulta;
  };
  return {
    provider: { provide: Supabase, useValue: { Sup: { auth, from } } },
    auth,
    perfiles,
    emitir: (evento: AuthChangeEvent, sesion: Session | null) => {
      sesionGuardada = sesion;
      oyentes.forEach((oyente) => oyente(evento, sesion));
    },
    // Otra pestaña cerró la sesión: el almacenamiento ya no la tiene, pero esta
    // pestaña todavía no recibió ningún evento.
    cerrarEnOtraPestana: () => {
      sesionGuardada = null;
    },
  };
}
