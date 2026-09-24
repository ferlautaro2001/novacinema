import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Session } from '@supabase/supabase-js';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { supabaseDePrueba } from '../../core/supabase/supabase-de-prueba';

describe('Encabezado y sesión (US-02.04)', () => {
  const textoSesion = (raiz: HTMLElement) =>
    raiz.querySelector('.sesion')!.textContent!.replace(/\s+/g, ' ').trim();

  async function crearConSesion() {
    // Una sesión guardada que Supabase recupera al abrir o recargar la página.
    const supabase = supabaseDePrueba({ user: { id: 'u1' } } as Session);
    supabase.perfiles.set('u1', { nombre: 'Ana', apellido: 'Pérez', rol: { codigo: 'cliente' } });
    TestBed.configureTestingModule({ providers: [provideRouter(routes), supabase.provider] });
    const fixture = TestBed.createComponent(App);
    const raiz: HTMLElement = fixture.nativeElement;
    await TestBed.inject(Router).navigateByUrl('/cartelera');
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(raiz.querySelector('.sesion')).not.toBeNull();
    });
    await fixture.whenStable();
    return { fixture, raiz };
  }

  it('con una sesión guardada muestra el nombre y el acceso al perfil (AC-02.04.01)', async () => {
    const { raiz } = await crearConSesion();

    expect(textoSesion(raiz)).toContain('Hola, Ana');
    expect(
      raiz.querySelector<HTMLAnchorElement>('a[href="/cuenta/perfil"]')?.textContent,
    ).toContain('Mi perfil');
  });

  it('al cerrar la sesión vuelve a Inicio como visitante (AC-02.04.02)', async () => {
    const { fixture, raiz } = await crearConSesion();
    const cerrar = Array.from(raiz.querySelectorAll('button')).find((b) =>
      b.textContent!.includes('Cerrar sesión'),
    )!;

    cerrar.click();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/inicio');
    });
    await fixture.whenStable();

    expect(raiz.querySelector('main h1')?.textContent).toContain('Inicio');
    expect(
      Array.from(raiz.querySelectorAll('.sesion a')).map((a) => a.textContent!.trim()),
    ).toEqual(['Ingresar', 'Crear cuenta']);
    expect(raiz.textContent).not.toContain('Mi perfil');
    expect(raiz.textContent).not.toContain('Hola, Ana');
  });
});
