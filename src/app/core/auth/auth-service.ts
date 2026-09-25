import { inject, Service, signal } from '@angular/core';
import type { AuthError, User } from '@supabase/supabase-js';
import type { Rol } from '../models/enumerados';
import { Supabase } from '../supabase/supabase-client';

export interface DatosRegistro {
  email: string;
  clave: string;
  nombre: string;
  apellido: string;
  // ISO "1990-02-14": el trigger crear_perfil la convierte con ::date.
  fechaNacimiento: string;
}

// Si Supabase pide confirmar el email, la sesión recién existe cuando se toca el link.
export type ResultadoRegistro = 'sesion_iniciada' | 'confirmar_email';

// Sale de la tabla usuarios, no de los metadatos de Auth.
export interface PerfilSesion {
  nombre: string;
  apellido: string;
  rol: Rol;
}

export function inicioSegunRol(rol: Rol): string {
  switch (rol) {
    case 'administrador':
      return '/admin';
    case 'empleado':
      return '/boleteria';
    default:
      return '/inicio';
  }
}

const MENSAJES_ERROR: Record<string, string> = {
  user_already_exists: 'Ese email ya está registrado',
  email_exists: 'Ese email ya está registrado',
  weak_password: 'La contraseña es muy débil. Probá con una más larga.',
  email_address_invalid: 'Ingresá un email válido',
  over_email_send_rate_limit: 'Se enviaron demasiados emails. Probá de nuevo en unos minutos.',
  over_request_rate_limit: 'Hubo demasiados intentos. Probá de nuevo en unos minutos.',
  signup_disabled: 'El registro está deshabilitado por el momento.',
};

// Mismo mensaje para email inexistente y contraseña equivocada, así no se revela cuál falló.
const CREDENCIALES_INCORRECTAS = 'Email o contraseña incorrectos';

@Service()
export class AuthService {
  private supS = inject(Supabase);

  cargando = signal(true);
  usuario = signal<User | null>(null);
  perfil = signal<PerfilSesion | null>(null);

  // Los guards esperan esta promesa: si alguien abre /admin directo, el guard corre
  // antes de que Supabase haya leído la sesión guardada.
  private terminarCarga!: () => void;
  private cargaTerminada = new Promise<void>((resolver) => (this.terminarCarga = resolver));

  constructor() {
    // El primer evento (INITIAL_SESSION) llega cuando Supabase terminó de leer la
    // sesión guardada; hasta ahí `cargando` queda en true.
    this.supS.Sup.auth.onAuthStateChange((_evento, sesion) => {
      const usuario = sesion?.user ?? null;
      this.usuario.set(usuario);
      if (!usuario) {
        this.perfil.set(null);
        this.marcarListo();
        return;
      }
      // Supabase advierte que consultar adentro de este callback puede trabarse,
      // por eso cargo el perfil en el turno siguiente.
      setTimeout(() => this.cargarPerfil(usuario.id).finally(() => this.marcarListo()));
    });
  }

  // El perfil lo crea el trigger crear_perfil con lo que viaja en options.data.
  async registrarse(datos: DatosRegistro): Promise<ResultadoRegistro> {
    const { data, error } = await this.supS.Sup.auth.signUp({
      email: datos.email.trim(),
      password: datos.clave,
      options: {
        data: {
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          fecha_nacimiento: datos.fechaNacimiento,
        },
      },
    });
    if (error) throw new Error(this.mensajeDeError(error));

    // Con la confirmación de email activa, Supabase no avisa que el email ya existe:
    // devuelve un usuario sin identidades, y es la única forma de detectarlo.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error(MENSAJES_ERROR['user_already_exists']);
    }
    return data.session ? 'sesion_iniciada' : 'confirmar_email';
  }

  async iniciarSesion(email: string, clave: string): Promise<Rol> {
    const { data, error } = await this.supS.Sup.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    });
    if (error) {
      if (error.code === 'invalid_credentials' || error.code === 'email_not_confirmed') {
        throw new Error(CREDENCIALES_INCORRECTAS);
      }
      throw new Error(this.mensajeDeError(error, 'No se pudo iniciar la sesión. Probá de nuevo.'));
    }
    const perfil = await this.cargarPerfil(data.user.id);
    if (!perfil) throw new Error('No se pudo leer tu perfil. Probá de nuevo.');
    return perfil.rol;
  }

  listo(): Promise<void> {
    return this.cargaTerminada;
  }

  // Leo la sesión de nuevo en vez de confiar en la de memoria: si se cerró en otra
  // pestaña, acá me entero.
  async sesionVigente(): Promise<boolean> {
    const { data } = await this.supS.Sup.auth.getSession();
    if (!data.session) {
      this.usuario.set(null);
      this.perfil.set(null);
      return false;
    }
    return true;
  }

  // SIGNED_OUT también limpia todo, pero lo hago acá para que la pantalla cambie en el acto.
  async cerrarSesion(): Promise<void> {
    const { error } = await this.supS.Sup.auth.signOut();
    if (error) throw new Error('No se pudo cerrar la sesión. Probá de nuevo.');
    this.usuario.set(null);
    this.perfil.set(null);
  }

  private marcarListo(): void {
    this.cargando.set(false);
    this.terminarCarga();
  }

  private async cargarPerfil(id: string): Promise<PerfilSesion | null> {
    const { data, error } = await this.supS.Sup.from('usuarios')
      .select('nombre, apellido, rol:roles(codigo)')
      .eq('id', id)
      .single();

    if (error || !data?.rol) {
      this.perfil.set(null);
      return null;
    }

    const perfil: PerfilSesion = {
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol.codigo as Rol,
    };
    this.perfil.set(perfil);
    return perfil;
  }

  private mensajeDeError(
    error: AuthError,
    general = 'No se pudo crear la cuenta. Probá de nuevo en unos minutos.',
  ): string {
    if (error.code && MENSAJES_ERROR[error.code]) return MENSAJES_ERROR[error.code];
    return general;
  }
}
