import { TestBed } from '@angular/core/testing';
import type { Session } from '@supabase/supabase-js';
import { supabaseDePrueba } from '../supabase/supabase-de-prueba';
import { AuthService } from './auth-service';

describe('AuthService (US-02.01)', () => {
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
