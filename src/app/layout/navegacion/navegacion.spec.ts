import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { supabaseDePrueba } from '../../core/supabase/supabase-de-prueba';

describe('Navegacion (US-01.03)', () => {
  function enlace(raiz: HTMLElement, texto: string): HTMLAnchorElement {
    const enlaces = Array.from(raiz.querySelectorAll<HTMLAnchorElement>('nav a'));
    return enlaces.find((a) => a.textContent?.trim() === texto)!;
  }

  it('resalta la sección actual (AC-01.03.01)', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), supabaseDePrueba().provider],
    });
    const fixture = TestBed.createComponent(App);
    const raiz: HTMLElement = fixture.nativeElement;

    await TestBed.inject(Router).navigateByUrl('/inicio');
    await fixture.whenStable();
    expect(enlace(raiz, 'Inicio').getAttribute('aria-current')).toBe('page');

    enlace(raiz, 'Cartelera').click();
    await fixture.whenStable();

    expect(raiz.querySelector('main h1')?.textContent).toContain('Cartelera');
    expect(enlace(raiz, 'Cartelera').getAttribute('aria-current')).toBe('page');
    expect(enlace(raiz, 'Cartelera').classList).toContain('activo');
    expect(enlace(raiz, 'Inicio').getAttribute('aria-current')).toBeNull();
    expect(enlace(raiz, 'Inicio').classList).not.toContain('activo');
  });
});
