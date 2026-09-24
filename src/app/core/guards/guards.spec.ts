import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Session } from '@supabase/supabase-js';
import { routes } from '../../app.routes';
import { supabaseDePrueba } from '../supabase/supabase-de-prueba';
import { adminHijosGuard } from './admin-hijos-guard';

// Guards de US-02.05 probados con las rutas reales de la app.
describe('protección de secciones (US-02.05)', () => {
  async function abrir(url: string, rol: string | null) {
    const sesion = rol ? ({ user: { id: 'u1' } } as Session) : null;
    const supabase = supabaseDePrueba(sesion);
    if (rol)
      supabase.perfiles.set('u1', { nombre: 'Ana', apellido: 'Pérez', rol: { codigo: rol } });
    TestBed.configureTestingModule({ providers: [provideRouter(routes), supabase.provider] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return {
      url: TestBed.inject(Router).url,
      h1: harness.routeNativeElement?.querySelector('h1')?.textContent?.trim(),
      supabase,
      harness,
    };
  }

  describe('secciones privadas requieren sesión (AC-02.05.01)', () => {
    it('un visitante que abre Mi perfil va al ingreso', async () => {
      const { url, h1 } = await abrir('/cuenta/perfil', null);
      expect(url).toBe('/auth/login');
      expect(h1).toBe('Ingresar');
    });

    it('con sesión, Mi perfil se muestra', async () => {
      const { url, h1 } = await abrir('/cuenta/perfil', 'cliente');
      expect(url).toBe('/cuenta/perfil');
      expect(h1).toBe('Mi perfil');
    });
  });

  describe('secciones según rol (AC-02.05.02)', () => {
    it.each([
      ['cliente', '/admin'],
      ['empleado', '/admin'],
      ['cliente', '/boleteria'],
      [null, '/admin'],
    ])('un %s que abre %s ve "Página no encontrada"', async (rol, destino) => {
      const { h1 } = await abrir(destino, rol);
      expect(h1).toBe('Página no encontrada');
    });

    it.each([
      ['administrador', '/boleteria', '/boleteria/venta', 'Boletería'],
      ['empleado', '/boleteria', '/boleteria/venta', 'Boletería'],
      ['administrador', '/admin', '/admin/facturacion', 'Facturación'],
    ])('un %s abre %s con normalidad', async (rol, destino, final, titulo) => {
      const { url, h1 } = await abrir(destino, rol);
      expect(url).toBe(final);
      expect(h1).toBe(titulo);
    });
  });

  describe('subsecciones del Panel (AC-02.05.03)', () => {
    async function correrGuard() {
      return TestBed.runInInjectionContext(() =>
        adminHijosGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
    }

    it('deja pasar mientras la sesión de administrador sigue vigente', async () => {
      await abrir('/admin/facturacion', 'administrador');
      expect(await correrGuard()).toBe(true);
    });

    it('si la sesión se cerró en otra pestaña, lleva al ingreso', async () => {
      const { supabase } = await abrir('/admin/facturacion', 'administrador');
      supabase.cerrarEnOtraPestana();

      const resultado = await correrGuard();

      expect(resultado).toBeInstanceOf(UrlTree);
      expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/auth/login');
    });
  });
});
