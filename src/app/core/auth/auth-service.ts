import { inject, Service, signal } from '@angular/core';
import type { AuthError, User } from '@supabase/supabase-js';
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

const MENSAJES_ERROR: Record<string, string> = {
  user_already_exists: 'Ese email ya está registrado',
  email_exists: 'Ese email ya está registrado',
  weak_password: 'La contraseña es muy débil. Probá con una más larga.',
  email_address_invalid: 'Ingresá un email válido',
  over_email_send_rate_limit: 'Se enviaron demasiados emails. Probá de nuevo en unos minutos.',
  over_request_rate_limit: 'Hubo demasiados intentos. Probá de nuevo en unos minutos.',
  signup_disabled: 'El registro está deshabilitado por el momento.',
};

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

  readonly cargando = this._cargando.asReadonly();
  readonly usuario = this._usuario.asReadonly();

  constructor() {
    this.supS.Sup.auth.onAuthStateChange((_evento, sesion) => {
      this._usuario.set(sesion?.user ?? null);
      this._cargando.set(false);
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

  private mensajeDeError(error: AuthError): string {
    const conocido = error.code ? MENSAJES_ERROR[error.code] : undefined;
    return conocido ?? 'No se pudo crear la cuenta. Probá de nuevo en unos minutos.';
  }
}
