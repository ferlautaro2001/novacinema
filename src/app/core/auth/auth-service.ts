import { inject, Service, signal } from '@angular/core';
import type { AuthError, Session, User } from '@supabase/supabase-js';
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
  let ruta = '/inicio';

  switch (rol) {
    case 'administrador':
      ruta = '/admin';
      break;

    case 'empleado':
      ruta = '/boleteria';
      break;
  }

  return ruta;
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
  private cargaTerminada = new Promise<void>((resolver) => this.guardarResolver(resolver));

  constructor() {
    // El primer evento (INITIAL_SESSION) llega cuando Supabase terminó de leer la
    // sesión guardada; hasta ahí `cargando` queda en true.
    this.supS.Sup.auth.onAuthStateChange((_evento, sesion) => this.alCambiarSesion(sesion));
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
    if (error !== null) {
      const mensaje = this.mensajeDeError(error);
      throw new Error(mensaje);
    }

    // Con la confirmación de email activa, Supabase no avisa que el email ya existe:
    // devuelve un usuario sin identidades, y es la única forma de detectarlo.
    let emailYaRegistrado = false;

    if (data.user !== null) {
      const identidades = data.user.identities;

      if (identidades !== undefined && identidades.length === 0) {
        emailYaRegistrado = true;
      }
    }

    if (emailYaRegistrado) {
      throw new Error(MENSAJES_ERROR['user_already_exists']);
    }

    let resultado: ResultadoRegistro = 'confirmar_email';

    if (data.session !== null) {
      resultado = 'sesion_iniciada';
    }

    return resultado;
  }

  async iniciarSesion(email: string, clave: string): Promise<Rol> {
    const { data, error } = await this.supS.Sup.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    });
    if (error !== null) {
      let sonCredencialesIncorrectas = false;

      if (error.code === 'invalid_credentials') {
        sonCredencialesIncorrectas = true;
      } else if (error.code === 'email_not_confirmed') {
        sonCredencialesIncorrectas = true;
      }

      if (sonCredencialesIncorrectas) {
        throw new Error(CREDENCIALES_INCORRECTAS);
      }

      const mensaje = this.mensajeDeError(error, 'No se pudo iniciar la sesión. Probá de nuevo.');
      throw new Error(mensaje);
    }

    const perfil = await this.cargarPerfil(data.user.id);

    if (perfil === null) {
      throw new Error('No se pudo leer tu perfil. Probá de nuevo.');
    }

    const rol = perfil.rol;

    return rol;
  }

  listo(): Promise<void> {
    const carga = this.cargaTerminada;

    return carga;
  }

  // Leo la sesión de nuevo en vez de confiar en la de memoria: si se cerró en otra
  // pestaña, acá me entero.
  async sesionVigente(): Promise<boolean> {
    const { data } = await this.supS.Sup.auth.getSession();

    let vigente = false;

    if (data.session !== null) {
      vigente = true;
    } else {
      this.usuario.set(null);
      this.perfil.set(null);
    }

    return vigente;
  }

  // SIGNED_OUT también limpia todo, pero lo hago acá para que la pantalla cambie en el acto.
  async cerrarSesion(): Promise<void> {
    const { error } = await this.supS.Sup.auth.signOut();
    if (error !== null) {
      throw new Error('No se pudo cerrar la sesión. Probá de nuevo.');
    }

    this.usuario.set(null);
    this.perfil.set(null);
  }

  private guardarResolver(resolver: () => void): void {
    this.terminarCarga = resolver;
  }

  private alCambiarSesion(sesion: Session | null): void {
    let usuario: User | null = null;

    if (sesion !== null) {
      usuario = sesion.user;
    }

    this.usuario.set(usuario);

    if (usuario !== null) {
      const id = usuario.id;
      // Supabase advierte que consultar adentro de este callback puede trabarse,
      // por eso cargo el perfil en el turno siguiente.
      setTimeout(() => this.cargarPerfilYMarcarListo(id));
    } else {
      this.perfil.set(null);
      this.marcarListo();
    }
  }

  private cargarPerfilYMarcarListo(id: string): void {
    this.cargarPerfil(id).finally(() => this.marcarListo());
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

    let perfil: PerfilSesion | null = null;

    if (error === null && data !== null && data.rol !== null && data.rol !== undefined) {
      const rol = data.rol.codigo as Rol;

      perfil = {
        nombre: data.nombre,
        apellido: data.apellido,
        rol: rol,
      };
    }

    this.perfil.set(perfil);

    return perfil;
  }

  private mensajeDeError(
    error: AuthError,
    general = 'No se pudo crear la cuenta. Probá de nuevo en unos minutos.',
  ): string {
    let mensaje = general;

    if (error.code !== undefined) {
      const traducido = MENSAJES_ERROR[error.code];

      if (traducido !== undefined) {
        mensaje = traducido;
      }
    }

    return mensaje;
  }
}
