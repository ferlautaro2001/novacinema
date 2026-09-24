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

// Qué pasó después del alta: si Supabase pide confirmar el email, la sesión
// recién existe cuando la persona toca el link que le llega.
export type ResultadoRegistro = 'sesion_iniciada' | 'confirmar_email';

// Lo que la app necesita saber de quien está logueado: cómo nombrarlo y qué rol
// tiene. Sale de la tabla usuarios, no de los metadatos de Auth.
export interface PerfilSesion {
  nombre: string;
  apellido: string;
  rol: Rol;
}

// La sección donde arranca cada rol después de ingresar.
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

// Mismo mensaje para email inexistente y contraseña equivocada: no se revela cuál
// de los dos falló.
const CREDENCIALES_INCORRECTAS = 'Email o contraseña incorrectos';

// Estado de la sesión para toda la app. Me suscribo a onAuthStateChange apenas se
// crea el servicio: el primer evento (INITIAL_SESSION) llega cuando Supabase
// terminó de leer la sesión guardada, y recién ahí sé si hay alguien logueado.
// Mientras tanto `cargando` queda en true y el componente raíz muestra la
// pantalla de carga en vez de una sección que quizás no corresponde.
@Service()
export class AuthService {
  private readonly supS = inject(Supabase);

  private readonly _cargando = signal(true);
  private readonly _usuario = signal<User | null>(null);
  private readonly _perfil = signal<PerfilSesion | null>(null);

  readonly cargando = this._cargando.asReadonly();
  readonly usuario = this._usuario.asReadonly();
  readonly perfil = this._perfil.asReadonly();

  // Se resuelve una sola vez, cuando se terminó de recuperar la sesión y el perfil.
  // Los guards la esperan: si alguien abre /admin directo, el guard corre antes de
  // que Supabase haya leído la sesión guardada.
  private terminarCarga!: () => void;
  private readonly cargaTerminada = new Promise<void>(
    (resolver) => (this.terminarCarga = resolver),
  );

  constructor() {
    this.supS.Sup.auth.onAuthStateChange((_evento, sesion) => {
      const usuario = sesion?.user ?? null;
      this._usuario.set(usuario);
      if (!usuario) {
        this._perfil.set(null);
        this.marcarListo();
        return;
      }
      // Supabase advierte que llamarlo de nuevo desde adentro de este callback
      // puede trabarse: la consulta del perfil sale en el turno siguiente.
      setTimeout(() => this.cargarPerfil(usuario.id).finally(() => this.marcarListo()));
    });
  }

  // El perfil (rol cliente, 0 puntos) lo crea el trigger crear_perfil con los
  // datos que viajan en options.data; acá no se inserta nada en usuarios.
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

    // Con la confirmación de email activa, Supabase no avisa que el email ya
    // existe (para no revelar quién tiene cuenta): devuelve un usuario sin
    // identidades. Es la única forma de detectarlo.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error(MENSAJES_ERROR['user_already_exists']);
    }
    return data.session ? 'sesion_iniciada' : 'confirmar_email';
  }

  // Devuelve el rol para que la pantalla de ingreso sepa a dónde llevar a cada uno.
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

  // Vuelve a leer la sesión en lugar de confiar en la que quedó en memoria: si se
  // cerró en otra pestaña, acá se entera. Supabase la lee del almacenamiento del
  // navegador, que las pestañas comparten.
  async sesionVigente(): Promise<boolean> {
    const { data } = await this.supS.Sup.auth.getSession();
    if (!data.session) {
      this._usuario.set(null);
      this._perfil.set(null);
      return false;
    }
    return true;
  }

  // Cierra la sesión en Supabase y en este navegador. El evento SIGNED_OUT limpia
  // usuario y perfil; lo hago también acá para que la pantalla cambie en el acto.
  async cerrarSesion(): Promise<void> {
    const { error } = await this.supS.Sup.auth.signOut();
    if (error) throw new Error('No se pudo cerrar la sesión. Probá de nuevo.');
    this._usuario.set(null);
    this._perfil.set(null);
  }

  private marcarListo(): void {
    this._cargando.set(false);
    this.terminarCarga();
  }

  private async cargarPerfil(id: string): Promise<PerfilSesion | null> {
    const { data, error } = await this.supS.Sup.from('usuarios')
      .select('nombre, apellido, rol:roles(codigo)')
      .eq('id', id)
      .single();

    if (error || !data?.rol) {
      this._perfil.set(null);
      return null;
    }

    const perfil: PerfilSesion = {
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol.codigo as Rol,
    };
    this._perfil.set(perfil);
    return perfil;
  }

  private mensajeDeError(
    error: AuthError,
    general = 'No se pudo crear la cuenta. Probá de nuevo en unos minutos.',
  ): string {
    const conocido = error.code ? MENSAJES_ERROR[error.code] : undefined;
    return conocido ?? general;
  }
}
