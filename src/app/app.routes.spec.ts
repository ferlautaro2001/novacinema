import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('rutas de la app (US-01.03)', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    harness = await RouterTestingHarness.create();
  });

  it('la dirección raíz lleva a Inicio (AC-01.03.03)', async () => {
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/inicio');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Inicio');
  });

  it('una dirección inexistente muestra la página no encontrada (AC-01.03.02)', async () => {
    await harness.navigateByUrl('/estrenos-viejos');
    const pagina = harness.routeNativeElement!;
    expect(pagina.querySelector('h1')?.textContent).toContain('Página no encontrada');
    const volver = pagina.querySelector<HTMLAnchorElement>('a.nc-btn');
    expect(volver?.textContent).toContain('Volver al inicio');
    expect(volver?.getAttribute('href')).toBe('/inicio');
  });

  it('cada sección tiene su título', async () => {
    await harness.navigateByUrl('/cartelera');
    expect(TestBed.inject(Title).getTitle()).toBe('Cartelera · NovaCinema');
    await harness.navigateByUrl('/no-existe');
    expect(TestBed.inject(Title).getTitle()).toBe('Página no encontrada · NovaCinema');
  });
});
