import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { supabaseDePrueba } from './core/supabase/supabase-de-prueba';

describe('App', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), supabaseDePrueba().provider],
    });
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la pantalla de carga hasta recuperar la sesión y después la sección (AC-02.01.01)', async () => {
    // Sin INITIAL_SESSION todavía: la sesión se está recuperando.
    const supabase = supabaseDePrueba(false);
    TestBed.configureTestingModule({ providers: [provideRouter(routes), supabase.provider] });
    const fixture = TestBed.createComponent(App);
    const raiz: HTMLElement = fixture.nativeElement;

    await TestBed.inject(Router).navigateByUrl('/cartelera');
    await fixture.whenStable();

    const carga = raiz.querySelector('nc-pantalla-carga');
    expect(carga?.querySelector('img')?.getAttribute('alt')).toBe('NovaCinema');
    expect(carga?.textContent).toContain('Cargando…');
    expect(raiz.querySelector('nav')).toBeNull();
    expect(raiz.querySelector('main')).toBeNull();

    supabase.emitir('INITIAL_SESSION', null);
    await fixture.whenStable();

    expect(raiz.querySelector('nc-pantalla-carga')).toBeNull();
    expect(raiz.querySelector('main h1')?.textContent).toContain('Cartelera');
  });
});
