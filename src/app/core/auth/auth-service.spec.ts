import { TestBed } from '@angular/core/testing';
import { AuthError, type AuthResponse, type Session, type User } from '@supabase/supabase-js';
import { supabaseDePrueba } from '../supabase/supabase-de-prueba';
import { AuthService, DatosRegistro } from './auth-service';

describe('AuthService', () => {
  describe('sesión (US-02.01)', () => {
    it('arranca cargando y termina con el primer evento de sesión', () => {
      const supabase = supabaseDePrueba(false);
      TestBed.configureTestingModule({ providers: [supabase.provider] });
      const auth = TestBed.inject(AuthService);

      expect(auth.cargando()).toBe(true);
      expect(auth.usuario()).toBeNull();

      supabase.emitir('INITIAL_SESSION', null);

      expect(auth.cargando()).toBe(false);
      expect(auth.usuario()).toBeNull();
    });

    it('toma el usuario de la sesión recuperada', () => {
      const sesion = { user: { id: 'u1', email: 'ana@mail.com' } } as Session;
      TestBed.configureTestingModule({ providers: [supabaseDePrueba(sesion).provider] });
      const auth = TestBed.inject(AuthService);

      expect(auth.cargando()).toBe(false);
      expect(auth.usuario()?.id).toBe('u1');
    });
  });

  describe('registro (US-02.02)', () => {
    const ana: DatosRegistro = {
      email: ' ana@mail.com ',
      clave: 'cine2026',
      nombre: ' Ana ',
      apellido: 'Pérez',
      fechaNacimiento: '1990-02-14',
    };
    const usuario = (identidades: number) =>
      ({ id: 'u1', identities: Array.from({ length: identidades }, () => ({})) }) as User;

    function crear(respuesta: AuthResponse) {
      const supabase = supabaseDePrueba();
      const pedidos: unknown[] = [];
      supabase.auth.signUp = (credenciales) => {
        pedidos.push(credenciales);
        return Promise.resolve(respuesta);
      };
      TestBed.configureTestingModule({ providers: [supabase.provider] });
      return { auth: TestBed.inject(AuthService), pedidos };
    }

    it('manda los datos del perfil en options.data para el trigger (AC-02.02.01)', async () => {
      const { auth, pedidos } = crear({
        data: { user: usuario(1), session: { user: usuario(1) } as Session },
        error: null,
      });

      expect(await auth.registrarse(ana)).toBe('sesion_iniciada');
      expect(pedidos).toEqual([
        {
          email: 'ana@mail.com',
          password: 'cine2026',
          options: {
            data: { nombre: 'Ana', apellido: 'Pérez', fecha_nacimiento: '1990-02-14' },
          },
        },
      ]);
    });

    it('avisa que hay que confirmar el email cuando Supabase no devuelve sesión', async () => {
      const { auth } = crear({ data: { user: usuario(1), session: null }, error: null });
      expect(await auth.registrarse(ana)).toBe('confirmar_email');
    });

    it('rechaza un email ya registrado con confirmación activa (AC-02.02.03)', async () => {
      const { auth } = crear({ data: { user: usuario(0), session: null }, error: null });
      await expect(auth.registrarse(ana)).rejects.toThrow('Ese email ya está registrado');
    });

    it('rechaza un email ya registrado sin confirmación (AC-02.02.03)', async () => {
      const { auth } = crear({
        data: { user: null, session: null },
        error: new AuthError('User already registered', 422, 'user_already_exists'),
      });
      await expect(auth.registrarse(ana)).rejects.toThrow('Ese email ya está registrado');
    });

    it('traduce un error desconocido a un mensaje general', async () => {
      const { auth } = crear({
        data: { user: null, session: null },
        error: new AuthError('boom', 500, 'unexpected_failure'),
      });
      await expect(auth.registrarse(ana)).rejects.toThrow(
        'No se pudo crear la cuenta. Probá de nuevo en unos minutos.',
      );
    });
  });
});
